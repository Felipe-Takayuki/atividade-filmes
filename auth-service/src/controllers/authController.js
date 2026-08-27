import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

/**
 * 1. Esqueci Minha Senha — Gera token de 30 minutos e envia e-mail real via SMTP
 * Rota: POST /forgot-password
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'O e-mail é obrigatório para recuperar a senha.' });
    }

    const emailNorm = email.trim().toLowerCase();

    // Busca usuário pelo e-mail
    const [rows] = await pool.query(
      'SELECT id, nome, email FROM usuarios WHERE email = ?',
      [emailNorm]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Nenhuma conta encontrada com o e-mail informado.'
      });
    }

    const user = rows[0];

    // Gera token criptográfico único (32 bytes = 64 caracteres hex)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Salva no banco com expiração de 30 minutos (DATE_ADD(NOW(), INTERVAL 30 MINUTE))
    await pool.query(
      `INSERT INTO reset_tokens (token, usuario_id, criado_em, expira_em, usado)
       VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 MINUTE), FALSE)`,
      [resetToken, user.id]
    );

    // Envia o e-mail real via Mailtrap/Brevo
    await sendPasswordResetEmail({
      toEmail: user.email,
      userName: user.nome,
      resetToken
    });

    return res.json({
      success: true,
      message: `E-mail de recuperação enviado para ${user.email}. O link é válido por 30 minutos.`
    });
  } catch (err) {
    console.error('[Password-Reset-Service] Erro em forgotPassword:', err);
    return res.status(500).json({
      error: err.message || 'Erro ao processar solicitação de recuperação de senha.'
    });
  }
}

/**
 * 2. Validação prévia do link de recuperação
 * Rota: GET /verify-reset-token/:token
 */
export async function verifyResetToken(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ valid: false, error: 'Token não fornecido.' });
    }

    const [rows] = await pool.query(
      `SELECT rt.id, rt.token, rt.usuario_id, rt.criado_em, rt.expira_em, rt.usado,
              u.nome, u.email
       FROM reset_tokens rt
       JOIN usuarios u ON rt.usuario_id = u.id
       WHERE rt.token = ?`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        valid: false,
        error: 'Token de recuperação inválido ou inexistente.'
      });
    }

    const tokenRecord = rows[0];

    // 1. Checa se já foi usado
    if (tokenRecord.usado) {
      return res.status(400).json({
        valid: false,
        error: 'Este link de recuperação já foi utilizado. Solicite um novo link.'
      });
    }

    // 2. Checa se expirou (30 minutos)
    const agora = new Date();
    const expiraEm = new Date(tokenRecord.expira_em);
    if (agora > expiraEm) {
      return res.status(400).json({
        valid: false,
        error: 'Este link de recuperação expirou (validade de 30 minutos). Solicite um novo link.'
      });
    }

    return res.json({
      valid: true,
      email: tokenRecord.email,
      nome: tokenRecord.nome,
      expira_em: tokenRecord.expira_em
    });
  } catch (err) {
    console.error('[Password-Reset-Service] Erro ao verificar token:', err);
    return res.status(500).json({ valid: false, error: 'Erro ao validar token de recuperação.' });
  }
}

/**
 * 3. Redefinição de senha com validação completa dos 3 requisitos:
 * - O token existe?
 * - Ainda não passou de expira_em (30 minutos)?
 * - Ainda não foi usado?
 * Rota: POST /reset-password
 */
export async function resetPassword(req, res) {
  try {
    const { token, nova_senha } = req.body;

    if (!token || !nova_senha) {
      return res.status(400).json({
        error: 'Token e nova senha são obrigatórios.'
      });
    }

    if (nova_senha.length < 4) {
      return res.status(400).json({
        error: 'A nova senha deve conter no mínimo 4 caracteres.'
      });
    }

    // Busca o token no banco de dados
    const [rows] = await pool.query(
      `SELECT rt.id, rt.token, rt.usuario_id, rt.criado_em, rt.expira_em, rt.usado, u.email
       FROM reset_tokens rt
       JOIN usuarios u ON rt.usuario_id = u.id
       WHERE rt.token = ?`,
      [token]
    );

    // REGRA 1: O token existe?
    if (rows.length === 0) {
      return res.status(400).json({
        error: 'Token de recuperação inválido ou inexistente. Solicite um novo link.'
      });
    }

    const tokenRecord = rows[0];

    // REGRA 2: Ainda não foi usado?
    if (tokenRecord.usado) {
      return res.status(400).json({
        error: 'Este link de recuperação já foi utilizado. Solicite um novo link.'
      });
    }

    // REGRA 3: Ainda não passou de expira_em (30 minutos)?
    const agora = new Date();
    const expiraEm = new Date(tokenRecord.expira_em);
    if (agora > expiraEm) {
      return res.status(400).json({
        error: 'Este link de recuperação expirou (validade de 30 minutos). Solicite um novo link.'
      });
    }

    // Se todas as 3 regras passaram, atualiza a senha
    const saltRounds = 10;
    const nova_senha_hash = await bcrypt.hash(nova_senha, saltRounds);

    // Atualiza a senha na tabela usuarios
    await pool.query(
      'UPDATE usuarios SET senha_hash = ? WHERE id = ?',
      [nova_senha_hash, tokenRecord.usuario_id]
    );

    // Marca o token como usado (evita reutilização)
    await pool.query(
      'UPDATE reset_tokens SET usado = TRUE WHERE id = ?',
      [tokenRecord.id]
    );

    console.log(`[Password-Reset-Service] Senha alterada com sucesso para o usuário ${tokenRecord.email} (ID: ${tokenRecord.usuario_id}).`);

    return res.json({
      success: true,
      message: 'Senha alterada com sucesso! Você já pode entrar com sua nova senha.'
    });
  } catch (err) {
    console.error('[Password-Reset-Service] Erro ao redefinir senha:', err);
    return res.status(500).json({
      error: 'Erro interno ao redefinir senha.'
    });
  }
}

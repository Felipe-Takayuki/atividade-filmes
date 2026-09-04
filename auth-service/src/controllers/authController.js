import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { generateToken } from '../middleware/auth.js';

// ==============================================================================
// 1. AUTENTICAÇÃO E GESTÃO DE USUÁRIOS (Cadastro, Login, Perfil e Roles)
// ==============================================================================

/**
 * Cadastro de novo usuário
 * Rota: POST /register ou POST /api/auth/register
 */
export async function register(req, res) {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios (nome, email, senha).' });
    }

    if (senha.length < 4) {
      return res.status(400).json({ error: 'A senha deve conter no mínimo 4 caracteres.' });
    }

    const emailNorm = email.trim().toLowerCase();
    // Todo usuário registrado recebe obrigatoriamente o papel 'usuario'.
    // Privilégios de 'admin' não podem ser auto-atribuídos no registro público.
    const userRole = 'usuario';

    // Verifica duplicidade de e-mail no banco
    const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [emailNorm]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }

    // Criptografa a senha com bcrypt
    const saltRounds = 10;
    const senha_hash = await bcrypt.hash(senha, saltRounds);

    // Insere novo usuário
    const [result] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash, role) VALUES (?, ?, ?, ?)',
      [nome.trim(), emailNorm, senha_hash, userRole]
    );

    const user = {
      id: result.insertId,
      nome: nome.trim(),
      email: emailNorm,
      role: userRole
    };

    // Gera token JWT de autenticação
    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso.',
      user,
      token
    });
  } catch (err) {
    console.error('[Auth-Service] Erro no cadastro:', err);
    return res.status(500).json({ error: 'Erro interno ao realizar cadastro.' });
  }
}

/**
 * Login de usuário
 * Rota: POST /login ou POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const emailNorm = email.trim().toLowerCase();

    const [rows] = await pool.query(
      'SELECT id, nome, email, senha_hash, role FROM usuarios WHERE email = ?',
      [emailNorm]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas. E-mail ou senha incorretos.' });
    }

    const userRecord = rows[0];
    const senhaValida = await bcrypt.compare(senha, userRecord.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas. E-mail ou senha incorretos.' });
    }

    const user = {
      id: userRecord.id,
      nome: userRecord.nome,
      email: userRecord.email,
      role: userRecord.role || 'usuario'
    };

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login realizado com sucesso.',
      user,
      token
    });
  } catch (err) {
    console.error('[Auth-Service] Erro no login:', err);
    return res.status(500).json({ error: 'Erro interno ao realizar login.' });
  }
}

/**
 * Consulta perfil do usuário autenticado (/me)
 * Rota: GET /me ou GET /api/auth/me
 */
export async function me(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    const [rows] = await pool.query(
      'SELECT id, nome, email, role, criado_em FROM usuarios WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json({
      success: true,
      user: rows[0]
    });
  } catch (err) {
    console.error('[Auth-Service] Erro ao consultar perfil:', err);
    return res.status(500).json({ error: 'Erro interno ao consultar perfil.' });
  }
}

/**
 * Consulta papel (role) de um usuário pelo ID
 * Rota: GET /users/:id/role ou GET /api/auth/users/:id/role
 */
export async function getUserRole(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuário inválido.' });
    }

    const [rows] = await pool.query(
      'SELECT id, nome, email, role FROM usuarios WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json({
      success: true,
      id: rows[0].id,
      nome: rows[0].nome,
      email: rows[0].email,
      role: rows[0].role || 'usuario'
    });
  } catch (err) {
    console.error('[Auth-Service] Erro ao consultar papel do usuário:', err);
    return res.status(500).json({ error: 'Erro interno ao consultar papel do usuário.' });
  }
}

/**
 * Validação centralizada de autorização / permissão RBAC (Padrão A)
 * Rota: POST /authorize ou POST /api/auth/authorize
 * Body: { userId, requiredRole, action }
 */
export async function authorize(req, res) {
  try {
    const { userId, requiredRole, action } = req.body;
    const uid = parseInt(userId, 10);

    if (isNaN(uid)) {
      return res.status(400).json({ authorized: false, error: 'userId obrigatório e deve ser numérico.' });
    }

    const [rows] = await pool.query(
      'SELECT id, nome, email, role FROM usuarios WHERE id = ?',
      [uid]
    );

    if (rows.length === 0) {
      return res.status(404).json({ authorized: false, error: 'Usuário não encontrado.' });
    }

    const user = rows[0];
    const role = user.role || 'usuario';

    // 1. Validação por papel exigido (ex: requiredRole = 'admin')
    if (requiredRole && role !== requiredRole) {
      return res.status(403).json({
        authorized: false,
        userId: user.id,
        role,
        requiredRole,
        action,
        error: `Acesso proibido. Esta ação requer permissão de ${requiredRole}.`
      });
    }

    // 2. Validação por ação específica de moderação
    if (action === 'delete:other-comment' && role !== 'admin') {
      return res.status(403).json({
        authorized: false,
        userId: user.id,
        role,
        action,
        error: 'Acesso proibido. Apenas administradores podem excluir comentários de outros usuários.'
      });
    }

    return res.json({
      authorized: true,
      userId: user.id,
      nome: user.nome,
      role,
      action: action || 'authorized'
    });
  } catch (err) {
    console.error('[Auth-Service] Erro em authorize:', err);
    return res.status(500).json({ authorized: false, error: 'Erro interno ao validar autorização.' });
  }
}

/**
 * Promove um usuário para o papel 'admin' através do seu e-mail.
 * Ação exclusiva de Administrador.
 * Rota: POST /users/promote
 * Body: { email, requesterId }
 */
export async function promoteUserByEmail(req, res) {
  try {
    const { email, requesterId } = req.body;

    // 1. Validação do solicitante (deve ser admin)
    const reqId = parseInt(requesterId, 10);
    if (isNaN(reqId)) {
      return res.status(400).json({ error: 'requesterId obrigatório e deve ser numérico.' });
    }

    const [requesterRows] = await pool.query(
      'SELECT id, role FROM usuarios WHERE id = ?',
      [reqId]
    );

    if (requesterRows.length === 0 || requesterRows[0].role !== 'admin') {
      return res.status(403).json({
        error: 'Acesso proibido. Apenas administradores podem promover outros usuários para admin.',
        code: 'FORBIDDEN_NOT_ADMIN'
      });
    }

    // 2. Validação do e-mail do usuário alvo
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'O e-mail do usuário a ser promovido é obrigatório.' });
    }

    const targetEmail = email.trim().toLowerCase();

    // 3. Busca o usuário alvo pelo e-mail
    const [targetRows] = await pool.query(
      'SELECT id, nome, email, role FROM usuarios WHERE email = ?',
      [targetEmail]
    );

    if (targetRows.length === 0) {
      return res.status(404).json({
        error: `Nenhum usuário encontrado com o e-mail '${targetEmail}'.`
      });
    }

    const targetUser = targetRows[0];

    // Se já for admin
    if (targetUser.role === 'admin') {
      return res.status(400).json({
        error: `O usuário '${targetUser.nome}' (${targetUser.email}) já possui o papel de Administrador.`
      });
    }

    // 4. Atualiza o papel para 'admin' no MariaDB
    await pool.query(
      "UPDATE usuarios SET role = 'admin' WHERE id = ?",
      [targetUser.id]
    );

    console.log(`[Auth-Service] Administrador (ID: ${reqId}) promoveu usuário '${targetUser.nome}' (${targetUser.email}) para ADMIN.`);

    return res.json({
      success: true,
      message: `Usuário '${targetUser.nome}' (${targetUser.email}) foi promovido a Administrador com sucesso!`,
      user: {
        id: targetUser.id,
        nome: targetUser.nome,
        email: targetUser.email,
        role: 'admin'
      }
    });
  } catch (err) {
    console.error('[Auth-Service] Erro ao promover usuário:', err);
    return res.status(500).json({ error: 'Erro interno ao promover usuário.' });
  }
}

// ==============================================================================
// 2. RECUPERAÇÃO E REDEFINIÇÃO DE SENHA (Brevo SMTP / API)
// ==============================================================================

/**
 * 1. Esqueci Minha Senha — Gera token de 30 minutos e envia e-mail real via Brevo
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

    // Envia o e-mail real via Brevo
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

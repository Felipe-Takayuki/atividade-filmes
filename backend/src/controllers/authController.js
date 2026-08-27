import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool } from '../config/db.js';
import { generateToken } from '../middleware/auth.js';

dotenv.config();

const AUTH_SERVICE_URL = (process.env.AUTH_SERVICE_URL || 'http://auth-service:4000').replace(/\/+$/, '');

/**
 * Função auxiliar para realizar chamadas HTTP internas para o microsserviço de troca de senha.
 */
async function callAuthService(endpoint, options = {}) {
  const url = `${AUTH_SERVICE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));
    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (err) {
    console.error(`[Catálogo -> Auth-Service] Falha na comunicação com ${url}:`, err.message);
    return {
      status: 503,
      ok: false,
      data: { error: 'Serviço de troca de senha indisponível no momento. Tente novamente em instantes.' }
    };
  }
}

// ==============================================================================
// 1. AUTENTICAÇÃO E GESTÃO DE USUÁRIOS (Executado diretamente no Backend)
// ==============================================================================

/**
 * Cadastro de novo usuário
 * Rota: POST /api/auth/register
 */
export async function register(req, res) {
  try {
    const { nome, email, senha, role } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios (nome, email, senha).' });
    }

    if (senha.length < 4) {
      return res.status(400).json({ error: 'A senha deve conter no mínimo 4 caracteres.' });
    }

    const emailNorm = email.trim().toLowerCase();
    const userRole = (role === 'admin') ? 'admin' : 'usuario';

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

    // Grava cookie para conveniência / SSR
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      success: true,
      message: 'Usuário cadastrado com sucesso.',
      user,
      token
    });
  } catch (err) {
    console.error('[Backend-Auth] Erro no cadastro:', err);
    return res.status(500).json({ error: 'Erro interno ao realizar cadastro.' });
  }
}

/**
 * Login de usuário
 * Rota: POST /api/auth/login
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

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: 'Login realizado com sucesso.',
      user,
      token
    });
  } catch (err) {
    console.error('[Backend-Auth] Erro no login:', err);
    return res.status(500).json({ error: 'Erro interno ao realizar login.' });
  }
}

/**
 * Consulta perfil do usuário autenticado (/me)
 * Rota: GET /api/auth/me
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
    console.error('[Backend-Auth] Erro ao consultar perfil:', err);
    return res.status(500).json({ error: 'Erro interno ao consultar perfil.' });
  }
}

/**
 * Consulta papel (role) de um usuário pelo ID
 * Rota: GET /api/auth/users/:id/role
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
    console.error('[Backend-Auth] Erro ao consultar papel do usuário:', err);
    return res.status(500).json({ error: 'Erro interno ao consultar papel do usuário.' });
  }
}

/**
 * Logout
 * Rota: POST /api/auth/logout
 */
export function logout(req, res) {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logout realizado com sucesso.' });
}

// ==============================================================================
// 2. TROCA / RECUPERAÇÃO DE SENHA (Delegado ao microsserviço auth-service)
// ==============================================================================

/**
 * Encaminha solicitação de recuperação de senha (esqueci minha senha)
 * Rota: POST /api/auth/forgot-password
 */
export async function forgotPassword(req, res) {
  const { status, data } = await callAuthService('/forgot-password', {
    method: 'POST',
    body: JSON.stringify(req.body)
  });

  return res.status(status).json(data);
}

/**
 * Encaminha verificação prévia do token de recuperação
 * Rota: GET /api/auth/verify-reset-token/:token
 */
export async function verifyResetToken(req, res) {
  const { token } = req.params;
  const { status, data } = await callAuthService(`/verify-reset-token/${encodeURIComponent(token)}`, {
    method: 'GET'
  });

  return res.status(status).json(data);
}

/**
 * Encaminha redefinição da senha
 * Rota: POST /api/auth/reset-password
 */
export async function resetPassword(req, res) {
  const { status, data } = await callAuthService('/reset-password', {
    method: 'POST',
    body: JSON.stringify(req.body)
  });

  return res.status(status).json(data);
}

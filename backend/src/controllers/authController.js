import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { sendLogEvent, getClientIp } from '../services/logClient.js';

dotenv.config();

const AUTH_SERVICE_URL = (process.env.AUTH_SERVICE_URL || 'http://auth-service:4000').replace(/\/+$/, '');

/**
 * Função auxiliar para realizar chamadas HTTP internas para o microsserviço de autenticação.
 */
export async function callAuthService(endpoint, options = {}) {
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
      data: { error: 'Serviço de autenticação indisponível no momento. Tente novamente em instantes.' }
    };
  }
}

// ==============================================================================
// 1. AUTENTICAÇÃO E GESTÃO DE USUÁRIOS (Delegado ao microsserviço auth-service)
// ==============================================================================

/**
 * Cadastro de novo usuário
 * Rota: POST /api/auth/register
 */
export async function register(req, res) {
  const { nome, email, senha } = req.body;
  const { status, data } = await callAuthService('/register', {
    method: 'POST',
    body: JSON.stringify({ nome, email, senha })
  });

  if (data?.token) {
    res.cookie('token', data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
  }

  return res.status(status).json(data);
}

/**
 * Login de usuário
 * Rota: POST /api/auth/login
 */
export async function login(req, res) {
  const clientIp = getClientIp(req);
  const { status, data } = await callAuthService('/login', {
    method: 'POST',
    body: JSON.stringify(req.body)
  });

  if (status === 200 && data?.user) {
    if (data?.token) {
      res.cookie('token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }

    // Registra evento de auditoria: login realizado com sucesso
    sendLogEvent({
      usuario_id: data.user.id,
      usuario_email: data.user.email,
      acao: 'login',
      ip: clientIp,
      detalhes: {
        nome: data.user.nome,
        role: data.user.role || 'usuario'
      }
    });
  }

  return res.status(status).json(data);
}

/**
 * Consulta perfil do usuário autenticado (/me)
 * Rota: GET /api/auth/me
 */
export async function me(req, res) {
  const authHeader = req.headers.authorization;
  const token = authHeader || (req.cookies?.token ? `Bearer ${req.cookies.token}` : '');

  const { status, data } = await callAuthService('/me', {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: token } : {})
    }
  });

  return res.status(status).json(data);
}

/**
 * Consulta papel (role) de um usuário pelo ID
 * Rota: GET /api/auth/users/:id/role
 */
export async function getUserRole(req, res) {
  const { id } = req.params;
  const { status, data } = await callAuthService(`/users/${id}/role`, {
    method: 'GET'
  });

  return res.status(status).json(data);
}

/**
 * Encaminha validação centralizada de permissão ao auth-service (Padrão A)
 * Rota: POST /api/auth/authorize
 */
export async function authorize(req, res) {
  const { status, data } = await callAuthService('/authorize', {
    method: 'POST',
    body: JSON.stringify(req.body)
  });

  return res.status(status).json(data);
}

/**
 * Logout
 * Rota: POST /api/auth/logout
 */
export function logout(req, res) {
  const clientIp = getClientIp(req);
  let userId = 'anônimo';
  let userEmail = '';

  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : req.cookies?.token;
  if (token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded) {
        userId = decoded.id || 'anônimo';
        userEmail = decoded.email || '';
      }
    } catch (e) {}
  }

  // Registra evento de auditoria: logout
  sendLogEvent({
    usuario_id: userId,
    usuario_email: userEmail,
    acao: 'logout',
    ip: clientIp,
    detalhes: {
      origem: 'api/auth/logout'
    }
  });

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

/**
 * Promove um usuário para o papel 'admin' através do e-mail.
 * Ação exclusiva de Administrador com validação RBAC (Padrão A).
 * Rota: POST /api/auth/users/promote
 */
export async function promoteUserByEmail(req, res) {
  try {
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;
    const { email } = req.body;

    if (!requesterId) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'O e-mail do usuário a ser promovido é obrigatório.' });
    }

    // 1. Verificação preliminar local
    if (requesterRole !== 'admin') {
      sendLogEvent({
        usuario_id: requesterId,
        usuario_email: req.user?.email,
        acao: 'acao_negada_403',
        ip: getClientIp(req),
        detalhes: {
          motivo: 'Tentativa de promover usuário a administrador sem privilégio de admin',
          recurso: 'POST /api/auth/users/promote',
          email_alvo: email
        }
      });

      return res.status(403).json({
        error: 'Acesso proibido. Apenas administradores têm permissão para promover usuários a admin.',
        code: 'FORBIDDEN_NOT_ADMIN'
      });
    }

    // 2. Enforcement centralizado (Padrão A): consulta o microsserviço auth-service
    const { status, data } = await callAuthService('/users/promote', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        requesterId
      })
    });

    if (status === 200) {
      sendLogEvent({
        usuario_id: requesterId,
        usuario_email: req.user?.email,
        acao: 'promover_admin',
        ip: getClientIp(req),
        detalhes: {
          email_promovido: email.trim().toLowerCase(),
          mensagem: data.message
        }
      });
    }

    return res.status(status).json(data);
  } catch (err) {
    console.error('[Auth] Erro ao promover usuário por e-mail:', err);
    return res.status(500).json({ error: 'Erro ao processar promoção de usuário.' });
  }
}



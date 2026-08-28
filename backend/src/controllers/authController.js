import dotenv from 'dotenv';

dotenv.config();

const AUTH_SERVICE_URL = (process.env.AUTH_SERVICE_URL || 'http://auth-service:4000').replace(/\/+$/, '');

/**
 * Função auxiliar para realizar chamadas HTTP internas para o microsserviço de autenticação.
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
  const { status, data } = await callAuthService('/register', {
    method: 'POST',
    body: JSON.stringify(req.body)
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
  const { status, data } = await callAuthService('/login', {
    method: 'POST',
    body: JSON.stringify(req.body)
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


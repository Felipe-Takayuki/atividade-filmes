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

/**
 * Encaminha cadastro para o microsserviço de autenticação
 */
export async function register(req, res) {
  const { status, ok, data } = await callAuthService('/register', {
    method: 'POST',
    body: JSON.stringify(req.body)
  });

  if (ok && data.token) {
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
 * Encaminha login para o microsserviço de autenticação
 */
export async function login(req, res) {
  const { status, ok, data } = await callAuthService('/login', {
    method: 'POST',
    body: JSON.stringify(req.body)
  });

  if (ok && data.token) {
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
 * Encaminha consulta do perfil (/me) para o microsserviço
 */
export async function me(req, res) {
  const authHeader = req.headers.authorization || (req.cookies?.token ? `Bearer ${req.cookies.token}` : '');

  const { status, data } = await callAuthService('/me', {
    method: 'GET',
    headers: {
      'Authorization': authHeader
    }
  });

  return res.status(status).json(data);
}

/**
 * Encaminha solicitação de recuperação de senha (esqueci minha senha)
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
 */
export async function resetPassword(req, res) {
  const { status, data } = await callAuthService('/reset-password', {
    method: 'POST',
    body: JSON.stringify(req.body)
  });

  return res.status(status).json(data);
}

/**
 * Consulta papel de um usuário pelo ID diretamente no microsserviço
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
 */
export function logout(req, res) {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logout realizado com sucesso.' });
}

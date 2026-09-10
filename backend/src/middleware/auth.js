import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { sendLogEvent, getClientIp } from '../services/logClient.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'chave_jwt_secreta_local_dev';

/**
 * Middleware para verificar o token JWT e injetar o usuário autenticado na requisição.
 */
export function authenticate(req, res, next) {
  let token = null;

  // 1. Verifica no Header Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Se não encontrou no header, verifica nos cookies
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      error: 'Acesso negado. Token de autenticação não fornecido.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      nome: decoded.nome,
      role: decoded.role || 'usuario'
    };
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Sessão expirada ou token inválido. Por favor, faça login novamente.'
    });
  }
}

/**
 * Middleware opcional para restringir rotas por papel de usuário (ex: admin)
 */
export function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      sendLogEvent({
        usuario_id: req.user?.id || 'desconhecido',
        usuario_email: req.user?.email,
        acao: 'acao_negada_403',
        ip: getClientIp(req),
        detalhes: {
          motivo: `Acesso proibido. Ação requer papel ${requiredRole}`,
          rota: req.originalUrl || req.url,
          metodo: req.method,
          papel_atual: req.user?.role || 'nenhum'
        }
      });

      return res.status(403).json({
        error: `Acesso proibido. Esta ação requer permissão de ${requiredRole}.`,
        code: 'FORBIDDEN_NOT_ADMIN'
      });
    }
    next();
  };
}

/**
 * Gera um token JWT para o usuário.
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role || 'usuario'
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

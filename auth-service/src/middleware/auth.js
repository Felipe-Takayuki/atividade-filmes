import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'chave_jwt_secreta_local_dev';

/**
 * Middleware para validar o token JWT nas requisições ao auth-service.
 */
export function authenticate(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
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
      error: 'Token inválido ou expirado. Por favor, realize login novamente.'
    });
  }
}

/**
 * Gera um token JWT contendo id, email, nome e role do usuário.
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

/**
 * Valida diretamente uma string de token JWT.
 */
export function verifyJwtToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

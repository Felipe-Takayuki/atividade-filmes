import { Router } from 'express';
import {
  register,
  login,
  me,
  getUserRole,
  validateToken,
  forgotPassword,
  verifyResetToken,
  resetPassword
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Rotas de Autenticação e Gestão de Usuários
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me);

// Consulta de papéis de usuário (Requisito: "qual o papel desse usuário?")
router.get('/users/:id/role', getUserRole);
router.post('/validate-token', validateToken);

// Fluxo de Esqueci Minha Senha
router.post('/forgot-password', forgotPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.post('/reset-password', resetPassword);

export default router;

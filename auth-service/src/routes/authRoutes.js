import { Router } from 'express';
import {
  register,
  login,
  me,
  getUserRole,
  authorize,
  promoteUserByEmail,
  forgotPassword,
  verifyResetToken,
  resetPassword
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// 1. Autenticação e Gestão de Usuários
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me);
router.get('/users/:id/role', getUserRole);
router.post('/authorize', authorize);
router.post('/users/promote', promoteUserByEmail);


// 2. Fluxo de Troca / Recuperação de Senha (Esqueci Minha Senha)
router.post('/forgot-password', forgotPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.post('/reset-password', resetPassword);

export default router;


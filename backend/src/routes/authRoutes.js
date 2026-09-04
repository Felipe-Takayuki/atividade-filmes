import { Router } from 'express';
import {
  register,
  login,
  me,
  logout,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  getUserRole,
  authorize
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', me);
router.post('/logout', logout);

// Rotas de recuperação de senha delegadas ao auth-service
router.post('/forgot-password', forgotPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.post('/reset-password', resetPassword);

// Consulta de papel (role) e autorização RBAC
router.get('/users/:id/role', getUserRole);
router.post('/authorize', authorize);


export default router;

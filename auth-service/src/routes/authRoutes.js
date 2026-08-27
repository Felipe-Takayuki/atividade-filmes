import { Router } from 'express';
import {
  forgotPassword,
  verifyResetToken,
  resetPassword
} from '../controllers/authController.js';

const router = Router();

// Fluxo de Troca / Recuperação de Senha (Esqueci Minha Senha)
router.post('/forgot-password', forgotPassword);
router.get('/verify-reset-token/:token', verifyResetToken);
router.post('/reset-password', resetPassword);

export default router;

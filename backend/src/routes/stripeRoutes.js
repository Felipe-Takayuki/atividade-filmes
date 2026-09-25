import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createCheckoutSession,
  getSubscriptionStatus,
  getPublicConfig
} from '../controllers/stripeController.js';

const router = Router();

// Rota pública de configurações do plano / chave pública do Stripe
router.get('/config', getPublicConfig);

// Rotas protegidas por autenticação
router.post('/create-checkout-session', authenticate, createCheckoutSession);
router.get('/checkout', authenticate, createCheckoutSession);
router.get('/status', authenticate, getSubscriptionStatus);

export default router;

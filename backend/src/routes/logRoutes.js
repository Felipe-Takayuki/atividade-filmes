import { Router } from 'express';
import { getAuditLogs } from '../controllers/logController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Rota de consulta aos logs de auditoria (requer autenticação; apenas admin pode consultar)
router.get('/', authenticate, getAuditLogs);

export default router;

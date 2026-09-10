import { Router } from 'express';
import { createLog, getLogs, getStats } from '../controllers/logController.js';

const router = Router();

// Endpoints de eventos de auditoria
router.post('/', createLog);
router.get('/', getLogs);
router.get('/stats', getStats);

export default router;

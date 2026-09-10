import { fetchAuditLogs, sendLogEvent, getClientIp } from '../services/logClient.js';
import { callAuthService } from './authController.js';

/**
 * Consulta os eventos de auditoria protegida por RBAC (Apenas Admin).
 * Usuários comuns recebem HTTP 403 Forbidden e a tentativa é registrada no log.
 * Rota: GET /api/logs
 */
export async function getAuditLogs(req, res) {
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  const clientIp = getClientIp(req);

  // 1. Validação centralizada de autorização (Padrão A - Atividade 4)
  let userRole = req.user?.role || 'usuario';
  try {
    if (userId) {
      const authRes = await callAuthService(`/users/${userId}/role`, { method: 'GET' });
      if (authRes.ok && authRes.data?.role) {
        userRole = authRes.data.role;
      }
    }
  } catch (err) {
    console.warn('[AuditLogs] Falha ao consultar auth-service para validação de role, usando role do token:', err.message);
  }

  // 2. Se não for admin, rejeita com HTTP 403 e registra tentativa negada
  if (userRole !== 'admin') {
    console.warn(`[AuditLogs-RBAC] Bloqueio 403: Usuário ${userId || 'anônimo'} (${userRole}) tentou acessar consulta de logs de auditoria.`);

    // Registra tentativa negada no Redis Streams
    await sendLogEvent({
      usuario_id: userId || 'nao_autenticado',
      usuario_email: userEmail || '',
      acao: 'acao_negada_403',
      ip: clientIp,
      detalhes: {
        motivo: 'Tentativa de consulta aos logs de auditoria sem privilégio de administrador',
        recurso: 'GET /api/logs',
        papel_solicitante: userRole
      }
    });

    return res.status(403).json({
      error: 'Acesso proibido. Apenas administradores têm permissão para consultar os logs de auditoria.',
      code: 'FORBIDDEN_NOT_ADMIN'
    });
  }

  // 3. Usuário autenticado como administrador: consulta os logs no log-service
  const { limit, acao, usuario_id } = req.query;
  const result = await fetchAuditLogs({ limit, acao, usuario_id });

  return res.status(result.status).json(result.data);
}

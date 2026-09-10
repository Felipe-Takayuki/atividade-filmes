import { recordEvent, queryEvents, getStreamStats } from '../services/logService.js';

/**
 * Registra um evento de auditoria no Redis Streams
 * Rota: POST /logs ou POST /api/logs
 */
export async function createLog(req, res) {
  try {
    const { usuario_id, usuario_email, acao, timestamp, ip, detalhes } = req.body;

    if (usuario_id === undefined || usuario_id === null || !acao) {
      return res.status(400).json({
        error: 'Os campos "usuario_id" e "acao" são obrigatórios para registrar o evento de auditoria.'
      });
    }

    // Identifica o IP caso não venha no body
    const resolvedIp = ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

    const eventId = await recordEvent({
      usuario_id,
      usuario_email,
      acao,
      timestamp: timestamp || new Date().toISOString(),
      ip: resolvedIp,
      detalhes
    });

    return res.status(201).json({
      success: true,
      message: 'Evento gravado no Redis Stream com sucesso.',
      id: eventId,
      event: {
        usuario_id,
        acao,
        timestamp: timestamp || new Date().toISOString(),
        ip: resolvedIp
      }
    });
  } catch (err) {
    console.error('[LogController] Erro ao registrar log no Redis:', err);
    return res.status(500).json({
      error: 'Erro interno ao persistir evento no Redis Streams.',
      detalhes: err.message
    });
  }
}

/**
 * Consulta os eventos de auditoria gravados no Redis Streams
 * Rota: GET /logs ou GET /api/logs
 */
export async function getLogs(req, res) {
  try {
    const { limit, acao, usuario_id } = req.query;

    const logs = await queryEvents({
      limit: limit ? parseInt(limit, 10) : 50,
      acao,
      usuario_id
    });

    const stats = await getStreamStats();

    return res.json({
      success: true,
      total_retornados: logs.length,
      stream_stats: stats,
      logs
    });
  } catch (err) {
    console.error('[LogController] Erro ao consultar logs do Redis:', err);
    return res.status(500).json({
      error: 'Erro interno ao consultar eventos do Redis Streams.',
      detalhes: err.message
    });
  }
}

/**
 * Consulta estatísticas do Stream
 * Rota: GET /stats
 */
export async function getStats(req, res) {
  try {
    const stats = await getStreamStats();
    return res.json({
      success: true,
      stats
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao obter estatísticas.', detalhes: err.message });
  }
}

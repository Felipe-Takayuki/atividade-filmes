import dotenv from 'dotenv';

dotenv.config();

const LOG_SERVICE_URL = (process.env.LOG_SERVICE_URL || 'http://log-service:5000').replace(/\/+$/, '');

/**
 * Extrai o IP real do cliente a partir do request Express,
 * considerando cabeçalhos de proxy reverso e Docker.
 */
export function getClientIp(req) {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
}

/**
 * Envia um evento de auditoria para o microsserviço de logs de forma segura (não-bloqueante).
 * 
 * @param {Object} event
 * @param {string|number} event.usuario_id ID do usuário autor da ação
 * @param {string} [event.usuario_email] E-mail do usuário (opcional)
 * @param {string} event.acao Nome da ação (ex: login, logout, favoritar_filme, comentar, apagar_comentario, acao_negada_403)
 * @param {string} [event.ip] IP do cliente
 * @param {Object|string} [event.detalhes] Metadados complementares
 * @param {string} [event.timestamp] Timestamp ISO opcional
 */
export async function sendLogEvent({
  usuario_id,
  usuario_email,
  acao,
  ip = '127.0.0.1',
  detalhes = {},
  timestamp
}) {
  const url = `${LOG_SERVICE_URL}/logs`;
  try {
    const payload = {
      usuario_id: usuario_id ?? 'sistema',
      usuario_email: usuario_email || '',
      acao,
      ip,
      detalhes,
      timestamp: timestamp || new Date().toISOString()
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`[LogClient] Resposta não-OK do log-service (${response.status}): ${errText}`);
      return { success: false, status: response.status };
    }

    const data = await response.json().catch(() => ({}));
    return { success: true, data };
  } catch (err) {
    // Log de auditoria não deve derrubar a requisição principal de negócio
    console.warn(`[LogClient] Falha ao enviar evento "${acao}" para o log-service (${url}):`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Consulta os logs de auditoria no log-service
 * 
 * @param {Object} queryParams
 * @param {number} [queryParams.limit=50]
 * @param {string} [queryParams.acao]
 * @param {string|number} [queryParams.usuario_id]
 */
export async function fetchAuditLogs(queryParams = {}) {
  const params = new URLSearchParams();
  if (queryParams.limit) params.append('limit', queryParams.limit);
  if (queryParams.acao) params.append('acao', queryParams.acao);
  if (queryParams.usuario_id) params.append('usuario_id', queryParams.usuario_id);

  const url = `${LOG_SERVICE_URL}/logs?${params.toString()}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: { error: `Erro retornado pelo log-service (status ${response.status})` }
      };
    }

    const data = await response.json();
    return { ok: true, status: 200, data };
  } catch (err) {
    console.error(`[LogClient] Erro ao consultar logs em ${url}:`, err.message);
    return {
      ok: false,
      status: 503,
      data: { error: 'Serviço de auditoria indisponível no momento.', detalhes: err.message }
    };
  }
}

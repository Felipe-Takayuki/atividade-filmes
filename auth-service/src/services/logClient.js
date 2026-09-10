import dotenv from 'dotenv';

dotenv.config();

const LOG_SERVICE_URL = (process.env.LOG_SERVICE_URL || 'http://log-service:5000').replace(/\/+$/, '');

/**
 * Extrai o IP do cliente
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
 * Envia um evento de auditoria para o log-service
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
      return { success: false, status: response.status };
    }

    const data = await response.json().catch(() => ({}));
    return { success: true, data };
  } catch (err) {
    console.warn(`[LogClient-AuthService] Falha ao enviar evento "${acao}" para ${url}:`, err.message);
    return { success: false, error: err.message };
  }
}

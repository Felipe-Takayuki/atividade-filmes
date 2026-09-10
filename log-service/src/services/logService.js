import { redis, STREAM_KEY } from '../config/redis.js';

/**
 * Registra um novo evento de auditoria no Redis Streams através do comando XADD.
 * 
 * @param {Object} event Dados do evento de auditoria
 * @param {string|number} event.usuario_id ID do usuário responsável pela ação
 * @param {string} [event.usuario_email] E-mail do usuário (opcional)
 * @param {string} event.acao Nome da ação realizada (ex: login, favoritar_filme, comentar, acao_negada_403)
 * @param {string} [event.timestamp] Timestamp ISO (se omitido, será gerado o instante atual)
 * @param {string} [event.ip] IP de origem da requisição
 * @param {Object|string} [event.detalhes] Metadados contextuais adicionais
 * @returns {Promise<string>} Retorna o ID gerado pelo Redis Stream (ex: 1725988291000-0)
 */
export async function recordEvent(event) {
  const {
    usuario_id,
    usuario_email = '',
    acao,
    timestamp = new Date().toISOString(),
    ip = '127.0.0.1',
    detalhes = {}
  } = event;

  if (usuario_id === undefined || usuario_id === null || !acao) {
    throw new Error('Campos obrigatórios ausentes: usuario_id e acao são exigidos.');
  }

  const payloadString = typeof detalhes === 'object' ? JSON.stringify(detalhes) : String(detalhes || '');

  // Executa o comando XADD no Redis Streams com ID autogerado '*'
  // Estrutura armazenada: usuario_id, acao, timestamp, ip, usuario_email, detalhes
  const entryId = await redis.xadd(
    STREAM_KEY,
    '*',
    'usuario_id', String(usuario_id),
    'acao', String(acao),
    'timestamp', String(timestamp),
    'ip', String(ip),
    'usuario_email', String(usuario_email),
    'detalhes', payloadString
  );

  return entryId;
}

/**
 * Consulta eventos do Redis Streams em ordem cronológica reversa (do mais recente para o mais antigo)
 * utilizando o comando XREVRANGE.
 * 
 * @param {Object} filters
 * @param {number} [filters.limit=50] Quantidade máxima de eventos
 * @param {string} [filters.acao] Filtro opcional por nome da ação
 * @param {string|number} [filters.usuario_id] Filtro opcional por ID do usuário
 * @returns {Promise<Array<Object>>} Lista de eventos parseados
 */
export async function queryEvents({ limit = 50, acao = null, usuario_id = null } = {}) {
  const maxLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

  // Consulta o Stream do mais recente (+) ao mais antigo (-)
  const rawEntries = await redis.xrevrange(STREAM_KEY, '+', '-', 'COUNT', maxLimit);

  const events = rawEntries.map(([id, fields]) => {
    const data = { id };
    for (let i = 0; i < fields.length; i += 2) {
      const field = fields[i];
      const value = fields[i + 1];

      if (field === 'detalhes') {
        try {
          data[field] = JSON.parse(value);
        } catch {
          data[field] = value;
        }
      } else {
        data[field] = value;
      }
    }
    return data;
  });

  // Filtros em memória se solicitados
  let filtered = events;
  if (acao) {
    filtered = filtered.filter(evt => evt.acao?.toLowerCase() === acao.toLowerCase());
  }
  if (usuario_id !== null && usuario_id !== undefined && usuario_id !== '') {
    filtered = filtered.filter(evt => String(evt.usuario_id) === String(usuario_id));
  }

  return filtered;
}

/**
 * Retorna estatísticas do Stream de Auditoria (XINFO STREAM)
 */
export async function getStreamStats() {
  try {
    const len = await redis.xlen(STREAM_KEY);
    return {
      stream_key: STREAM_KEY,
      total_events: len
    };
  } catch (err) {
    return {
      stream_key: STREAM_KEY,
      total_events: 0,
      error: err.message
    };
  }
}

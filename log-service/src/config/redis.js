import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
export const STREAM_KEY = process.env.REDIS_STREAM_KEY || 'audit:events';

export const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  lazyConnect: false,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  maxRetriesPerRequest: 3
});

redis.on('connect', () => {
  console.log(`[Redis] Conectado com sucesso em ${REDIS_HOST}:${REDIS_PORT}`);
});

redis.on('ready', () => {
  console.log(`[Redis] Pronto para receber comandos (Stream: ${STREAM_KEY})`);
});

redis.on('error', (err) => {
  console.error(`[Redis] Erro de conexão em ${REDIS_HOST}:${REDIS_PORT}:`, err.message);
});

redis.on('close', () => {
  console.warn('[Redis] Conexão encerrada.');
});

export async function pingRedis() {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (err) {
    return false;
  }
}

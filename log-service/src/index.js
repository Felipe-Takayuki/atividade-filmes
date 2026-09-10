import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import logRoutes from './routes/logRoutes.js';
import { pingRedis, STREAM_KEY } from './config/redis.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Middlewares
app.use(morgan('dev'));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck do Microsserviço de Logs
app.get('/health', async (req, res) => {
  const redisOk = await pingRedis();

  res.json({
    service: 'log-service (audit-logs)',
    status: redisOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    redis: {
      status: redisOk ? 'connected' : 'disconnected',
      stream: STREAM_KEY
    }
  });
});

// Rotas principais de auditoria (mapeadas em /logs e /api/logs)
app.use('/logs', logRoutes);
app.use('/api/logs', logRoutes);

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado no microsserviço de logs de auditoria.' });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('[Log-Service Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno no microsserviço de logs.'
  });
});

// Inicialização do servidor
function startServer() {
  console.log('==============================================');
  console.log('📋 Microsserviço de Logs e Auditoria (log-service)');
  console.log('==============================================');
  console.log(`📡 Stream configurada no Redis: ${STREAM_KEY}`);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serviço de Logs rodando na porta interna ${PORT}`);
    console.log(`🔒 Comunicação estrita via rede interna do Docker (sem porta exposta pro host)`);
  });
}

startServer();

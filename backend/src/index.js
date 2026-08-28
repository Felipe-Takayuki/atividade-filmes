import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDatabase, pool } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import movieRoutes from './routes/movieRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import { deleteComment } from './controllers/commentController.js';
import { authenticate } from './middleware/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const AUTH_SERVICE_URL = (process.env.AUTH_SERVICE_URL || 'http://auth-service:4000').replace(/\/+$/, '');

// Middlewares
app.use(morgan('dev'));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Servir arquivos estáticos do Frontend (React build / dist)
const distPath = path.resolve(__dirname, '../../frontend/dist');
const fallbackFrontendPath = path.resolve(__dirname, '../../frontend');
const frontendPath = fs.existsSync(distPath) ? distPath : fallbackFrontendPath;
app.use(express.static(frontendPath));

// Endpoint de verificação de integridade (Healthcheck)
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const [rows] = await pool.query('SELECT 1 as connected');
    if (rows && rows[0]?.connected === 1) {
      dbStatus = 'connected';
    }
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  // Verifica conectividade interna com o auth-service
  let authServiceStatus = 'unreachable';
  try {
    const authRes = await fetch(`${AUTH_SERVICE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (authRes.ok) {
      const authData = await authRes.json();
      authServiceStatus = authData.status === 'ok' ? 'connected' : 'degraded';
    } else {
      authServiceStatus = `http_error_${authRes.status}`;
    }
  } catch (authErr) {
    authServiceStatus = `offline (${authErr.message})`;
  }

  const tmdbKeyConfigured = Boolean(process.env.TMDB_API_KEY || process.env.TMDB_TOKEN);

  res.json({
    service: 'catalogo-frontend-backend',
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    auth_service: {
      url: AUTH_SERVICE_URL,
      status: authServiceStatus
    },
    tmdb_configured: tmdbKeyConfigured
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/movies/:tmdb_movie_id/comments', commentRoutes);
app.delete('/api/comments/:id', authenticate, deleteComment);
app.use('/api/favorites', favoriteRoutes);

// Rota fallback para SPA (Single Page Application)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint da API não encontrado.' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Middleware de tratamento global de erros
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno no servidor do catálogo.'
  });
});

// Inicialização do servidor e banco de dados
async function startServer() {
  console.log('==============================================');
  console.log('🎬 Catálogo de Filmes Tom Hanks - Servidor Principal');
  console.log('==============================================');
  console.log(`🔗 Conectado ao Serviço de Troca de Senha (auth-service) em: ${AUTH_SERVICE_URL}`);

  // Inicializa tabelas
  await initDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor do Catálogo rodando na porta ${PORT}`);
    console.log(`🌐 Ponto de entrada público: http://localhost:${PORT}`);
  });
}

startServer();

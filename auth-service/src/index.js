import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { initDatabase, pool } from './config/db.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();
if (!process.env.SMTP_USER && !process.env.BREVO_API_KEY && !process.env.SMTP_PASS) {
  const rootEnv = path.resolve(process.cwd(), '../.env');
  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  }
}

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// Middlewares
app.use(morgan('dev'));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint de verificação de integridade (Healthcheck)
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const [rows] = await pool.query('SELECT 1 as connected');
    if (rows && rows[0]?.connected === 1) {
      dbStatus = 'connected';
    }
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  const pass = process.env.SMTP_PASS?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim() || (pass && pass.startsWith('re_') ? pass : null);
  const brevoApiKey = process.env.BREVO_API_KEY?.trim() || (pass && pass.startsWith('xkeysib-') ? pass : null);
  const configured = Boolean((process.env.SMTP_USER && process.env.SMTP_PASS) || brevoApiKey || resendApiKey);
  
  let provider = 'SMTP';
  let emailMode = 'SMTP';
  if (resendApiKey) {
    provider = 'Resend';
    emailMode = 'REST API';
  } else if (brevoApiKey) {
    provider = 'Brevo';
    emailMode = 'REST API';
  } else if (process.env.SMTP_HOST?.includes('gmail')) {
    provider = 'Gmail';
  } else if (process.env.SMTP_HOST?.includes('brevo')) {
    provider = 'Brevo';
  }

  res.json({
    service: 'auth-service (password-reset)',
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    email: {
      provider,
      configured,
      mode: emailMode,
      host: process.env.SMTP_HOST || (resendApiKey ? 'api.resend.com' : 'smtp-relay.brevo.com'),
      port: process.env.SMTP_PORT || '587'
    },
    smtp: {
      provider,
      configured,
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: process.env.SMTP_PORT || '587'
    }
  });
});

// Rotas do microsserviço de troca/recuperação de senha
// Mapeadas tanto na raiz quanto com prefixo /api/auth para facilidade de proxy
app.use('/api/auth', authRoutes);
app.use('/', authRoutes);

// Tratamento de rotas inexistentes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado no microsserviço de troca de senha.' });
});

// Tratamento global de erros
app.use((err, req, res, next) => {
  console.error('[Password-Reset-Service Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno no microsserviço de troca de senha.'
  });
});

// Inicialização do servidor
async function startServer() {
  console.log('==============================================');
  console.log('🔑 Microsserviço de Troca de Senha (auth-service)');
  console.log('==============================================');

  // Inicializa o banco de dados MariaDB (tabelas usuarios e reset_tokens)
  await initDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serviço de Troca de Senha rodando na porta interna ${PORT}`);
    console.log(`🔒 Comunicação estrita via rede interna do Docker (sem porta exposta pro host)`);
  });
}

startServer();

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'mariadb',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'aluno',
  password: process.env.DB_PASSWORD || 'alunosenha',
  database: process.env.DB_NAME || 'catalogo_filmes',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

export const pool = mysql.createPool(dbConfig);

/**
 * Inicializa e migra as tabelas do MariaDB gerenciadas pelo auth-service:
 * 1. usuarios (com suporte a roles: 'usuario', 'admin')
 * 2. reset_tokens (tokens de recuperação com expiração e flag de uso)
 */
export async function initDatabase(retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Auth-DB] Conectando ao MariaDB em ${dbConfig.host}:${dbConfig.port}... (tentativa ${attempt}/${retries})`);
      const connection = await pool.getConnection();

      console.log('[Auth-DB] Conexão estabelecida com sucesso. Verificando tabelas de autenticação...');

      // 1. Tabela de Usuários (com coluna role)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(100) NOT NULL,
          email VARCHAR(150) UNIQUE NOT NULL,
          senha_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'usuario',
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Garante que a coluna 'role' existe caso a tabela tenha sido criada na atividade 2 sem essa coluna
      try {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM usuarios LIKE 'role';
        `);
        if (columns.length === 0) {
          console.log('[Auth-DB] Adicionando coluna "role" na tabela usuarios...');
          await connection.query(`
            ALTER TABLE usuarios ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'usuario' AFTER senha_hash;
          `);
        }
      } catch (colErr) {
        console.warn('[Auth-DB] Verificação da coluna role:', colErr.message);
      }

      // 2. Tabela de Tokens de Redefinição de Senha
      await connection.query(`
        CREATE TABLE IF NOT EXISTS reset_tokens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          token VARCHAR(255) UNIQUE NOT NULL,
          usuario_id INT NOT NULL,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expira_em TIMESTAMP NOT NULL,
          usado BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
          INDEX idx_token (token),
          INDEX idx_usuario (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      connection.release();
      console.log('[Auth-DB] Tabelas de autenticação (usuarios, reset_tokens) prontas.');
      return true;
    } catch (err) {
      console.error(`[Auth-DB] Erro ao conectar ao banco (tentativa ${attempt}/${retries}):`, err.message);
      if (attempt < retries) {
        console.log(`[Auth-DB] Aguardando ${delayMs / 1000}s antes da próxima tentativa...`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        console.error('[Auth-DB] Falha crítica ao conectar com o MariaDB após várias tentativas.');
        return false;
      }
    }
  }
  return false;
}

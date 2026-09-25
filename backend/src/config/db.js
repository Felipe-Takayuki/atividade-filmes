import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
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
 * Inicializa as tabelas de favoritos e comentários no MariaDB.
 */
export async function initDatabase(retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Catálogo-DB] Conectando ao MariaDB em ${dbConfig.host}:${dbConfig.port}... (tentativa ${attempt}/${retries})`);
      const connection = await pool.getConnection();

      console.log('[Catálogo-DB] Conexão estabelecida com sucesso. Verificando tabelas...');

      // Garante que a tabela de usuários base existe para manter a integridade referencial das Foreign Keys
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

      // Garante que a coluna 'role' existe caso a tabela tenha sido criada em versão anterior
      try {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM usuarios LIKE 'role';
        `);
        if (columns.length === 0) {
          console.log('[Catálogo-DB] Adicionando coluna "role" na tabela usuarios...');
          await connection.query(`
            ALTER TABLE usuarios ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'usuario' AFTER senha_hash;
          `);
        }
      } catch (colErr) {
        console.warn('[Catálogo-DB] Verificação da coluna role:', colErr.message);
      }

      // Garante que a coluna 'bio' existe (Atividade 6 - Perfil do Usuário)
      try {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM usuarios LIKE 'bio';
        `);
        if (columns.length === 0) {
          console.log('[Catálogo-DB] Adicionando coluna "bio" na tabela usuarios...');
          await connection.query(`
            ALTER TABLE usuarios ADD COLUMN bio TEXT NULL AFTER role;
          `);
        }
      } catch (bioErr) {
        console.warn('[Catálogo-DB] Verificação da coluna bio:', bioErr.message);
      }

      // Garante que a coluna 'foto_key' existe (Atividade 6 - Upload de Foto no Object Storage)
      try {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM usuarios LIKE 'foto_key';
        `);
        if (columns.length === 0) {
          console.log('[Catálogo-DB] Adicionando coluna "foto_key" na tabela usuarios...');
          await connection.query(`
            ALTER TABLE usuarios ADD COLUMN foto_key VARCHAR(255) NULL AFTER bio;
          `);
        }
      } catch (fotoErr) {
        console.warn('[Catálogo-DB] Verificação da coluna foto_key:', fotoErr.message);
      }

      // Garante que a coluna 'is_premium' existe (Atividade 7 - Plano Premium Stripe)
      try {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM usuarios LIKE 'is_premium';
        `);
        if (columns.length === 0) {
          console.log('[Catálogo-DB] Adicionando coluna "is_premium" na tabela usuarios...');
          await connection.query(`
            ALTER TABLE usuarios ADD COLUMN is_premium TINYINT(1) NOT NULL DEFAULT 0 AFTER foto_key;
          `);
        }
      } catch (premErr) {
        console.warn('[Catálogo-DB] Verificação da coluna is_premium:', premErr.message);
      }

      // Garante que a coluna 'stripe_customer_id' existe (Atividade 7 - ID de Cliente Stripe)
      try {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM usuarios LIKE 'stripe_customer_id';
        `);
        if (columns.length === 0) {
          console.log('[Catálogo-DB] Adicionando coluna "stripe_customer_id" na tabela usuarios...');
          await connection.query(`
            ALTER TABLE usuarios ADD COLUMN stripe_customer_id VARCHAR(255) NULL AFTER is_premium;
          `);
        }
      } catch (custErr) {
        console.warn('[Catálogo-DB] Verificação da coluna stripe_customer_id:', custErr.message);
      }

      // Garante que a coluna 'stripe_subscription_id' existe (Atividade 7 - ID de Assinatura Stripe)
      try {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM usuarios LIKE 'stripe_subscription_id';
        `);
        if (columns.length === 0) {
          console.log('[Catálogo-DB] Adicionando coluna "stripe_subscription_id" na tabela usuarios...');
          await connection.query(`
            ALTER TABLE usuarios ADD COLUMN stripe_subscription_id VARCHAR(255) NULL AFTER stripe_customer_id;
          `);
        }
      } catch (subErr) {
        console.warn('[Catálogo-DB] Verificação da coluna stripe_subscription_id:', subErr.message);
      }

      // Garante que a coluna 'premium_since' existe (Atividade 7 - Timestamp de Início Premium)
      try {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM usuarios LIKE 'premium_since';
        `);
        if (columns.length === 0) {
          console.log('[Catálogo-DB] Adicionando coluna "premium_since" na tabela usuarios...');
          await connection.query(`
            ALTER TABLE usuarios ADD COLUMN premium_since TIMESTAMP NULL AFTER stripe_subscription_id;
          `);
        }
      } catch (sinceErr) {
        console.warn('[Catálogo-DB] Verificação da coluna premium_since:', sinceErr.message);
      }

      // Tabela de Favoritos
      await connection.query(`
        CREATE TABLE IF NOT EXISTS favoritos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          usuario_id INT NOT NULL,
          tmdb_movie_id INT NOT NULL,
          titulo VARCHAR(255) NOT NULL,
          poster_path VARCHAR(255),
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
          UNIQUE KEY uq_usuario_filme (usuario_id, tmdb_movie_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Tabela de Comentários
      await connection.query(`
        CREATE TABLE IF NOT EXISTS comentarios (
          id INT AUTO_INCREMENT PRIMARY KEY,
          usuario_id INT NOT NULL,
          tmdb_movie_id INT NOT NULL,
          texto TEXT NOT NULL,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      connection.release();
      console.log('[Catálogo-DB] Tabelas verificadas e inicializadas com sucesso.');
      return true;
    } catch (err) {
      console.error(`[Catálogo-DB] Erro ao conectar ao banco (tentativa ${attempt}/${retries}):`, err.message);
      if (attempt < retries) {
        console.log(`[Catálogo-DB] Aguardando ${delayMs / 1000}s antes da próxima tentativa...`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        console.error('[Catálogo-DB] Falha ao conectar com o MariaDB após várias tentativas.');
        return false;
      }
    }
  }
  return false;
}

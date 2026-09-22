import * as Minio from 'minio';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';

dotenv.config();

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000', 10);
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ROOT_USER || process.env.MINIO_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.MINIO_ROOT_PASSWORD || process.env.MINIO_SECRET_KEY || 'minioadmin';

export const MINIO_BUCKET = process.env.MINIO_BUCKET || 'catalogo-perfil';
export const AVATAR_STORAGE_MODE = process.env.AVATAR_STORAGE_MODE || 'public'; // 'public' | 'presigned'
export const MINIO_PUBLIC_URL = (process.env.MINIO_PUBLIC_URL || `http://localhost:${MINIO_PORT}`).replace(/\/+$/, '');

export const minioClient = new Minio.Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY
});

/**
 * Inicializa a conexão com o MinIO:
 * 1. Verifica se o bucket dedicado existe, ou cria caso não exista.
 * 2. Se o modo for 'public', aplica a política de leitura pública (Public Read Policy)
 *    para permitir acesso direto dos navegadores às imagens.
 */
export async function initMinio(retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[MinIO] Conectando ao Object Storage em ${MINIO_ENDPOINT}:${MINIO_PORT}... (tentativa ${attempt}/${retries})`);
      const exists = await minioClient.bucketExists(MINIO_BUCKET);

      if (!exists) {
        console.log(`[MinIO] Criando bucket dedicado '${MINIO_BUCKET}'...`);
        await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
        console.log(`[MinIO] Bucket '${MINIO_BUCKET}' criado com sucesso.`);
      } else {
        console.log(`[MinIO] Bucket '${MINIO_BUCKET}' já existe.`);
      }

      // Aplica política de leitura pública se o modo for 'public'
      if (AVATAR_STORAGE_MODE === 'public') {
        const publicReadPolicy = {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'PublicReadAvatars',
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`]
            }
          ]
        };

        try {
          await minioClient.setBucketPolicy(MINIO_BUCKET, JSON.stringify(publicReadPolicy));
          console.log(`[MinIO] Política de leitura pública (Public Read) configurada no bucket '${MINIO_BUCKET}'.`);
        } catch (policyErr) {
          console.warn(`[MinIO] Aviso ao definir política do bucket:`, policyErr.message);
        }
      }

      console.log(`[MinIO] Object Storage pronto. Modo: ${AVATAR_STORAGE_MODE} | URL Pública Base: ${MINIO_PUBLIC_URL}`);
      return true;
    } catch (err) {
      console.error(`[MinIO] Erro ao conectar ao MinIO (tentativa ${attempt}/${retries}):`, err.message);
      if (attempt < retries) {
        console.log(`[MinIO] Aguardando ${delayMs / 1000}s antes da próxima tentativa...`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        console.warn('[MinIO] Não foi possível conectar ao MinIO no momento. As operações de upload ficarão temporariamente indisponíveis.');
        return false;
      }
    }
  }
  return false;
}

/**
 * Realiza upload de arquivo binário para o MinIO
 * @param {Buffer} buffer - Conteúdo binário do arquivo
 * @param {string} originalname - Nome original do arquivo
 * @param {string} mimetype - Tipo MIME da imagem (ex: image/jpeg)
 * @param {number|string} userId - ID do usuário proprietário
 * @returns {Promise<{ key: string }>} Chave única do objeto gerada
 */
export async function uploadAvatarToMinio(buffer, originalname, mimetype, userId) {
  const ext = path.extname(originalname).toLowerCase() || (mimetype === 'image/png' ? '.png' : mimetype === 'image/webp' ? '.webp' : '.jpg');
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  const objectKey = `avatars/user-${userId}-${Date.now()}-${randomSuffix}${ext}`;

  const metaData = {
    'Content-Type': mimetype,
    'X-Amz-Meta-UserId': String(userId),
    'X-Amz-Meta-OriginalName': encodeURIComponent(originalname)
  };

  await minioClient.putObject(MINIO_BUCKET, objectKey, buffer, buffer.length, metaData);

  return { key: objectKey };
}

/**
 * Remove um objeto de avatar do MinIO
 * @param {string} objectKey - Chave do objeto
 */
export async function deleteAvatarFromMinio(objectKey) {
  if (!objectKey) return;
  try {
    await minioClient.removeObject(MINIO_BUCKET, objectKey);
  } catch (err) {
    console.warn(`[MinIO] Falha ao remover objeto ${objectKey}:`, err.message);
  }
}

/**
 * Constrói a URL para exibição da foto de perfil.
 * Decisão arquitetural:
 * - Se 'presigned': Gera URL pré-assinada temporária com expiração de 24 horas.
 * - Se 'public' (padrão): Retorna a URL direta no MinIO público ou rota proxy fallback.
 * @param {string} objectKey - Chave do objeto
 * @param {object} [req] - Requisição HTTP Express opcional para construir URLs relativas
 * @returns {Promise<string|null>} URL completa para renderização no frontend
 */
export async function buildAvatarUrl(objectKey, req = null) {
  if (!objectKey) return null;

  if (AVATAR_STORAGE_MODE === 'presigned') {
    try {
      const presignedUrl = await minioClient.presignedGetObject(MINIO_BUCKET, objectKey, 24 * 60 * 60);
      // Se gerou com o host interno 'minio', substitui pelo host público
      if (MINIO_PUBLIC_URL && presignedUrl.includes('minio:')) {
        const parsed = new URL(presignedUrl);
        const publicParsed = new URL(MINIO_PUBLIC_URL);
        parsed.protocol = publicParsed.protocol;
        parsed.host = publicParsed.host;
        return parsed.toString();
      }
      return presignedUrl;
    } catch (err) {
      console.warn(`[MinIO] Erro ao gerar URL pré-assinada para ${objectKey}:`, err.message);
    }
  }

  // Modo Público (Padrão para Fotos de Perfil em Redes Sociais):
  // Retorna a URL direta do bucket MinIO
  return `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${objectKey}`;
}

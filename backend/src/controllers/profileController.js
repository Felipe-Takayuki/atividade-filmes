import { pool } from '../config/db.js';
import {
  uploadAvatarToMinio,
  deleteAvatarFromMinio,
  buildAvatarUrl,
  minioClient,
  MINIO_BUCKET
} from '../config/minio.js';
import { sendLogEvent, getClientIp } from '../services/logClient.js';

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

/**
 * Consulta a página de perfil de um usuário com seus dados e lista de favoritos.
 * Suporta consulta do próprio usuário logado (/api/profile) ou perfil público (/api/profile/:id)
 * Rota: GET /api/profile ou GET /api/profile/:id
 */
export async function getProfile(req, res) {
  try {
    const requesterId = req.user.id;
    const targetId = req.params.id ? parseInt(req.params.id, 10) : requesterId;

    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'ID de usuário inválido.' });
    }

    const isSelf = targetId === requesterId;

    // 1. Busca dados do usuário no MariaDB
    const [users] = await pool.query(
      'SELECT id, nome, email, role, bio, foto_key, criado_em FROM usuarios WHERE id = ?',
      [targetId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Perfil de usuário não encontrado.' });
    }

    const user = users[0];
    const fotoUrl = await buildAvatarUrl(user.foto_key, req);

    // 2. Busca lista de filmes favoritados pelo usuário (dado que existe desde a atividade 2)
    const [favorites] = await pool.query(
      `SELECT f.id, f.usuario_id, f.tmdb_movie_id, f.titulo, f.poster_path, f.criado_em,
              (SELECT COUNT(*) FROM comentarios c WHERE c.tmdb_movie_id = f.tmdb_movie_id) as comments_count
       FROM favoritos f
       WHERE f.usuario_id = ?
       ORDER BY f.criado_em DESC`,
      [targetId]
    );

    const formattedFavorites = favorites.map((fav) => ({
      ...fav,
      poster_url: fav.poster_path
        ? (fav.poster_path.startsWith('http') ? fav.poster_path : `${TMDB_IMAGE_BASE_URL}${fav.poster_path}`)
        : null
    }));

    return res.json({
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        email: isSelf ? user.email : undefined, // Oculta e-mail no perfil público de terceiros
        bio: user.bio || '',
        foto_key: user.foto_key || null,
        foto_url: fotoUrl,
        role: user.role || 'usuario',
        criado_em: user.criado_em,
        is_self: isSelf
      },
      favorites: formattedFavorites,
      total_favorites: formattedFavorites.length
    });
  } catch (err) {
    console.error('[Profile] Erro ao consultar perfil:', err);
    return res.status(500).json({ error: 'Erro interno ao consultar perfil do usuário.' });
  }
}

/**
 * Atualiza nome e bio do perfil do usuário.
 * REQUISITO 4: Cada um só edita o próprio perfil!
 * Se houver ID no parâmetro ou no body diferente do usuário autenticado no token JWT,
 * a requisição é terminantemente rejeitada com HTTP 403 Forbidden e auditada no Redis Streams.
 * Rota: PUT /api/profile ou PUT /api/profile/:id
 */
export async function updateProfile(req, res) {
  try {
    const requester = req.user;
    const clientIp = getClientIp(req);

    // Identifica o ID do alvo vindo da rota ou do body da requisição
    const rawTargetId = req.params.id || req.body.id || req.body.usuario_id;
    const targetId = rawTargetId ? parseInt(rawTargetId, 10) : requester.id;

    // ==============================================================================
    // REQUISITO 4 — Validação Estrita de Identidade no Backend:
    // O backend confere a identidade de quem está logado e NÃO confia no que veio
    // no corpo ou nos parâmetros da requisição.
    // ==============================================================================
    if (targetId !== requester.id) {
      // Registra evento de auditoria de segurança (tentativa recusada) no Redis Streams
      sendLogEvent({
        usuario_id: requester.id,
        usuario_email: requester.email,
        acao: 'acao_negada_403',
        ip: clientIp,
        detalhes: {
          motivo: 'Tentativa não autorizada de editar o perfil de outro usuário',
          recurso: `PUT /api/profile/${targetId}`,
          solicitante_id: requester.id,
          solicitante_email: requester.email,
          alvo_id: targetId,
          payload_tentativa: {
            nome: req.body.nome,
            bio: req.body.bio
          }
        }
      });

      return res.status(403).json({
        error: 'Acesso proibido. Você não tem permissão para editar o perfil de outro usuário.',
        code: 'FORBIDDEN_PROFILE_EDIT',
        solicitante_id: requester.id,
        alvo_id: targetId
      });
    }

    const { nome, bio } = req.body;

    if (nome !== undefined && (!nome || !nome.trim())) {
      return res.status(400).json({ error: 'O nome não pode ficar em branco.' });
    }

    const sanitizedBio = bio !== undefined ? String(bio).trim().slice(0, 500) : null;
    const sanitizedNome = nome !== undefined ? String(nome).trim() : null;

    // Atualiza dados no MariaDB
    if (sanitizedNome !== null && sanitizedBio !== null) {
      await pool.query('UPDATE usuarios SET nome = ?, bio = ? WHERE id = ?', [
        sanitizedNome,
        sanitizedBio,
        requester.id
      ]);
    } else if (sanitizedNome !== null) {
      await pool.query('UPDATE usuarios SET nome = ? WHERE id = ?', [sanitizedNome, requester.id]);
    } else if (sanitizedBio !== null) {
      await pool.query('UPDATE usuarios SET bio = ? WHERE id = ?', [sanitizedBio, requester.id]);
    }

    // Registra evento de auditoria: atualizar perfil
    sendLogEvent({
      usuario_id: requester.id,
      usuario_email: requester.email,
      acao: 'atualizar_perfil',
      ip: clientIp,
      detalhes: {
        nome_alterado: sanitizedNome !== null,
        bio_alterada: sanitizedBio !== null
      }
    });

    // Retorna os dados atualizados
    const [updatedUsers] = await pool.query(
      'SELECT id, nome, email, role, bio, foto_key, criado_em FROM usuarios WHERE id = ?',
      [requester.id]
    );

    const user = updatedUsers[0];
    const fotoUrl = await buildAvatarUrl(user.foto_key, req);

    return res.json({
      success: true,
      message: 'Perfil atualizado com sucesso.',
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        bio: user.bio || '',
        foto_key: user.foto_key || null,
        foto_url: fotoUrl,
        role: user.role || 'usuario',
        criado_em: user.criado_em,
        is_self: true
      }
    });
  } catch (err) {
    console.error('[Profile] Erro ao atualizar perfil:', err);
    return res.status(500).json({ error: 'Erro interno ao atualizar perfil do usuário.' });
  }
}

/**
 * Upload de Foto de Perfil:
 * 1. Valida identidade (REQUISITO 4).
 * 2. O arquivo binário é enviado ao MinIO (Object Storage) num bucket dedicado.
 * 3. Apenas a referência (chave do objeto) é armazenada no MariaDB.
 * 4. Remove a foto anterior do MinIO para economizar armazenamento.
 * Rota: POST /api/profile/upload-photo ou POST /api/profile/:id/upload-photo
 */
export async function uploadProfilePhoto(req, res) {
  try {
    const requester = req.user;
    const clientIp = getClientIp(req);

    const rawTargetId = req.params.id || req.body.usuario_id || req.body.id;
    const targetId = rawTargetId ? parseInt(rawTargetId, 10) : requester.id;

    // REQUISITO 4 — Validação de identidade no upload
    if (targetId !== requester.id) {
      sendLogEvent({
        usuario_id: requester.id,
        usuario_email: requester.email,
        acao: 'acao_negada_403',
        ip: clientIp,
        detalhes: {
          motivo: 'Tentativa não autorizada de alterar foto de perfil de outro usuário',
          recurso: `POST /api/profile/${targetId}/upload-photo`,
          solicitante_id: requester.id,
          alvo_id: targetId
        }
      });

      return res.status(403).json({
        error: 'Acesso proibido. Você não pode alterar a foto de perfil de outro usuário.',
        code: 'FORBIDDEN_PHOTO_UPLOAD'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Nenhum arquivo de imagem foi enviado. Use o campo "foto".',
        code: 'NO_FILE_PROVIDED'
      });
    }

    // 1. Obtém a foto atual do banco para limpeza posterior no MinIO
    const [rows] = await pool.query('SELECT foto_key FROM usuarios WHERE id = ?', [requester.id]);
    const previousFotoKey = rows[0]?.foto_key;

    // 2. Upload do arquivo binário para o MinIO (Object Storage)
    const { key } = await uploadAvatarToMinio(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      requester.id
    );

    // 3. Grava apenas a referência (chave) no MariaDB
    await pool.query('UPDATE usuarios SET foto_key = ? WHERE id = ?', [key, requester.id]);

    // 4. Remove o arquivo anterior do MinIO (se existia)
    if (previousFotoKey && previousFotoKey !== key) {
      await deleteAvatarFromMinio(previousFotoKey);
    }

    // 5. Monta a URL completa para exibição imediata
    const fotoUrl = await buildAvatarUrl(key, req);

    // Registra evento de auditoria: upload de foto
    sendLogEvent({
      usuario_id: requester.id,
      usuario_email: requester.email,
      acao: 'upload_foto_perfil',
      ip: clientIp,
      detalhes: {
        object_key: key,
        tamanho_bytes: req.file.size,
        mime_type: req.file.mimetype
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Foto de perfil atualizada com sucesso!',
      foto_key: key,
      foto_url: fotoUrl
    });
  } catch (err) {
    console.error('[Profile] Erro ao fazer upload de foto de perfil:', err);
    return res.status(500).json({ error: 'Erro ao processar upload da foto de perfil no storage.' });
  }
}

/**
 * Remove a foto de perfil atual do usuário:
 * 1. Remove o arquivo binário do MinIO.
 * 2. Define foto_key = NULL no MariaDB.
 * Rota: DELETE /api/profile/photo ou DELETE /api/profile/:id/photo
 */
export async function deleteProfilePhoto(req, res) {
  try {
    const requester = req.user;
    const clientIp = getClientIp(req);

    const rawTargetId = req.params.id || req.body.usuario_id || req.body.id;
    const targetId = rawTargetId ? parseInt(rawTargetId, 10) : requester.id;

    if (targetId !== requester.id) {
      sendLogEvent({
        usuario_id: requester.id,
        usuario_email: requester.email,
        acao: 'acao_negada_403',
        ip: clientIp,
        detalhes: {
          motivo: 'Tentativa não autorizada de excluir a foto de perfil de outro usuário',
          recurso: `DELETE /api/profile/${targetId}/photo`,
          solicitante_id: requester.id,
          alvo_id: targetId
        }
      });

      return res.status(403).json({
        error: 'Acesso proibido. Você não pode remover a foto de outro usuário.',
        code: 'FORBIDDEN_PHOTO_DELETE'
      });
    }

    const [rows] = await pool.query('SELECT foto_key FROM usuarios WHERE id = ?', [requester.id]);
    const currentFotoKey = rows[0]?.foto_key;

    if (currentFotoKey) {
      await deleteAvatarFromMinio(currentFotoKey);
      await pool.query('UPDATE usuarios SET foto_key = NULL WHERE id = ?', [requester.id]);
    }

    sendLogEvent({
      usuario_id: requester.id,
      usuario_email: requester.email,
      acao: 'remover_foto_perfil',
      ip: clientIp,
      detalhes: {
        foto_key_removida: currentFotoKey || null
      }
    });

    return res.json({
      success: true,
      message: 'Foto de perfil removida com sucesso.',
      foto_url: null
    });
  } catch (err) {
    console.error('[Profile] Erro ao remover foto de perfil:', err);
    return res.status(500).json({ error: 'Erro ao remover foto de perfil.' });
  }
}

/**
 * Proxy / Fallback direto para streaming de avatar do MinIO.
 * Útil para ambientes em que a porta 9000 do MinIO não é diretamente roteável pelo cliente.
 * Rota: GET /api/profile/avatar/:fotoKey(*)
 */
export async function streamAvatar(req, res) {
  try {
    const rawKey = req.params.fotoKey || req.params[0];
    const objectKey = Array.isArray(rawKey) ? rawKey.join('/') : (rawKey || '');
    if (!objectKey) {
      return res.status(400).send('Chave do objeto não especificada.');
    }

    const stat = await minioClient.statObject(MINIO_BUCKET, objectKey);
    const stream = await minioClient.getObject(MINIO_BUCKET, objectKey);

    res.setHeader('Content-Type', stat.metaData?.['content-type'] || 'image/jpeg');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

    stream.pipe(res);
  } catch (err) {
    if (err.code === 'NotFound' || err.code === 'NoSuchKey') {
      return res.status(404).send('Imagem não encontrada no storage.');
    }
    console.error('[Profile] Erro ao fazer streaming de avatar do MinIO:', err.message);
    return res.status(500).send('Erro ao recuperar imagem.');
  }
}

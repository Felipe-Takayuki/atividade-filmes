import { pool } from '../config/db.js';
import { callAuthService } from './authController.js';
import { sendLogEvent, getClientIp } from '../services/logClient.js';
import { buildAvatarUrl } from '../config/minio.js';

/**
 * Lista TODOS os comentários de um filme específico feitos por TODOS os usuários.
 * Rota: GET /api/movies/:tmdb_movie_id/comments
 */
export async function listMovieComments(req, res) {
  try {
    const movieId = parseInt(req.params.tmdb_movie_id, 10);

    if (isNaN(movieId)) {
      return res.status(400).json({ error: 'tmdb_movie_id inválido.' });
    }

    // Permite que todos os usuários vejam todos os comentários de todos os usuários com foto de perfil
    const [rows] = await pool.query(
      `SELECT c.id, c.usuario_id, c.tmdb_movie_id, c.texto, c.criado_em,
              u.nome as usuario_nome, u.role as usuario_role, u.bio as usuario_bio, u.foto_key
       FROM comentarios c
       JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.tmdb_movie_id = ?
       ORDER BY c.criado_em DESC`,
      [movieId]
    );

    const formattedComments = await Promise.all(
      rows.map(async (c) => ({
        ...c,
        foto_url: await buildAvatarUrl(c.foto_key, req)
      }))
    );

    return res.json({
      success: true,
      total: formattedComments.length,
      comments: formattedComments
    });
  } catch (err) {
    console.error('[Comments] Erro ao listar comentários:', err);
    return res.status(500).json({ error: 'Erro ao buscar comentários do filme.' });
  }
}

/**
 * Adiciona um comentário para um filme específico vinculado ao usuário logado.
 * Rota: POST /api/movies/:tmdb_movie_id/comments
 */
export async function addComment(req, res) {
  try {
    const userId = req.user.id;
    const movieId = parseInt(req.params.tmdb_movie_id, 10);
    const { texto } = req.body;

    if (isNaN(movieId)) {
      return res.status(400).json({ error: 'tmdb_movie_id inválido.' });
    }

    if (!texto || typeof texto !== 'string' || texto.trim().length === 0) {
      return res.status(400).json({ error: 'O texto do comentário não pode ser vazio.' });
    }

    const [result] = await pool.query(
      `INSERT INTO comentarios (usuario_id, tmdb_movie_id, texto)
       VALUES (?, ?, ?)`,
      [userId, movieId, texto.trim()]
    );

    const [newCommentRows] = await pool.query(
      `SELECT c.id, c.usuario_id, c.tmdb_movie_id, c.texto, c.criado_em,
              u.nome as usuario_nome, u.role as usuario_role
       FROM comentarios c
       JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.id = ?`,
      [result.insertId]
    );

    // Registra evento de auditoria: comentar
    sendLogEvent({
      usuario_id: userId,
      usuario_email: req.user?.email,
      acao: 'comentar',
      ip: getClientIp(req),
      detalhes: {
        tmdb_movie_id: movieId,
        comentario_id: result.insertId,
        texto_resumo: texto.trim().substring(0, 100)
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Comentário salvo com sucesso.',
      comment: newCommentRows[0]
    });
  } catch (err) {
    console.error('[Comments] Erro ao adicionar comentário:', err);
    return res.status(500).json({ error: 'Erro ao salvar comentário.' });
  }
}

/**
 * Remove um comentário com controle de acesso RBAC no backend:
 * - O autor do comentário pode excluir o próprio comentário.
 * - Comentários de outros usuários só podem ser excluídos por um ADMIN (moderação).
 * - Usuários comuns recebem HTTP 403 Forbidden ao tentar apagar comentário alheio.
 * - Enforcement centralizado (Padrão A): o catálogo consulta o auth-service para validar a permissão.
 *
 * Rota: DELETE /api/comments/:id
 */
export async function deleteComment(req, res) {
  try {
    const userId = req.user.id;
    const commentId = parseInt(req.params.id, 10);
    const clientIp = getClientIp(req);

    if (isNaN(commentId)) {
      return res.status(400).json({ error: 'ID do comentário inválido.' });
    }

    // 1. Busca o comentário no banco para saber quem é o autor
    const [commentRows] = await pool.query(
      'SELECT id, usuario_id, tmdb_movie_id, texto FROM comentarios WHERE id = ?',
      [commentId]
    );

    if (commentRows.length === 0) {
      return res.status(404).json({
        error: 'Comentário não encontrado.'
      });
    }

    const comment = commentRows[0];

    // 2. Se o comentário pertencer ao usuário logado, permite exclusão direta (dono do recurso)
    if (comment.usuario_id === userId) {
      await pool.query('DELETE FROM comentarios WHERE id = ?', [commentId]);

      // Registra evento de auditoria: apagar comentário próprio
      sendLogEvent({
        usuario_id: userId,
        usuario_email: req.user?.email,
        acao: 'apagar_comentario',
        ip: clientIp,
        detalhes: {
          comentario_id: commentId,
          tmdb_movie_id: comment.tmdb_movie_id,
          tipo: 'proprio_autor'
        }
      });

      return res.json({
        success: true,
        message: 'Comentário removido com sucesso pelo próprio autor.'
      });
    }

    // 3. Se o comentário for de outro usuário, exige papel de 'admin' (ação exclusiva de moderação)
    // Enforcement centralizado (Padrão A): consulta o papel do usuário no microsserviço auth-service
    let userRole = req.user.role;
    try {
      const authRes = await callAuthService(`/users/${userId}/role`, { method: 'GET' });
      if (authRes.ok && authRes.data?.role) {
        userRole = authRes.data.role;
      }
    } catch (authErr) {
      console.warn('[Comments-RBAC] Falha ao consultar auth-service, usando role do token:', authErr.message);
    }

    if (userRole !== 'admin') {
      console.warn(`[Comments-RBAC] Bloqueio 403: Usuário ${userId} (role: ${userRole}) tentou excluir comentário ${commentId} do usuário ${comment.usuario_id}`);

      // Registra evento de auditoria: tentativa de ação negada por permissão (403)
      sendLogEvent({
        usuario_id: userId,
        usuario_email: req.user?.email,
        acao: 'acao_negada_403',
        ip: clientIp,
        detalhes: {
          motivo: 'Tentativa de excluir comentário de outro usuário sem permissão de administrador',
          recurso: `DELETE /api/comments/${commentId}`,
          autor_original_id: comment.usuario_id,
          papel_solicitante: userRole
        }
      });

      return res.status(403).json({
        error: 'Acesso proibido. Apenas administradores têm permissão para excluir comentários de outros usuários.',
        code: 'FORBIDDEN_NOT_ADMIN'
      });
    }

    // 4. Usuário é admin: executa a exclusão administrativa
    await pool.query('DELETE FROM comentarios WHERE id = ?', [commentId]);

    console.log(`[Comments-RBAC] Sucesso 200: Administrador ${userId} excluiu comentário ${commentId} de outro usuário via moderação.`);

    // Registra evento de auditoria: apagar comentário (moderação por admin)
    sendLogEvent({
      usuario_id: userId,
      usuario_email: req.user?.email,
      acao: 'apagar_comentario',
      ip: clientIp,
      detalhes: {
        comentario_id: commentId,
        tmdb_movie_id: comment.tmdb_movie_id,
        autor_original_id: comment.usuario_id,
        tipo: 'moderacao_admin'
      }
    });

    return res.json({
      success: true,
      message: 'Comentário de outro usuário removido com sucesso por moderação de administrador.'
    });
  } catch (err) {
    console.error('[Comments] Erro ao remover comentário:', err);
    return res.status(500).json({ error: 'Erro ao remover comentário.' });
  }
}

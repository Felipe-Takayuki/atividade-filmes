import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function CommentsModal({ movie, onClose, onCommentsCountChange }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const movieId = movie?.id;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (!movieId) return;

    let isMounted = true;
    async function fetchComments() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getMovieComments(movieId);
        if (isMounted) {
          const list = res.comments || [];
          setComments(list);
          onCommentsCountChange?.(movieId, list.length);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Erro ao carregar comentários.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchComments();

    return () => {
      isMounted = false;
    };
  }, [movieId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    const texto = commentText.trim();
    if (!texto || !movieId) return;

    setSaving(true);
    try {
      const res = await api.addComment(movieId, texto);
      setCommentText('');
      showToast('Comentário publicado com sucesso!', 'success');

      if (res?.comment) {
        setComments((prev) => {
          const updated = [res.comment, ...prev];
          onCommentsCountChange?.(movieId, updated.length);
          return updated;
        });
      } else {
        const fetchRes = await api.getMovieComments(movieId);
        const list = fetchRes.comments || [];
        setComments(list);
        onCommentsCountChange?.(movieId, list.length);
      }
    } catch (err) {
      showToast(err.message || 'Erro ao salvar comentário.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComment = async (commentId, isAdminModeration = false) => {
    const confirmMsg = isAdminModeration
      ? 'Atenção [Moderação de Administrador]: Deseja realmente excluir este comentário feito por outro usuário?'
      : 'Deseja realmente excluir seu comentário?';

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.deleteComment(commentId);
      showToast(
        isAdminModeration
          ? 'Comentário removido via moderação de administrador.'
          : 'Comentário excluído.',
        'info'
      );

      setComments((prev) => {
        const updated = prev.filter((c) => c.id !== commentId);
        onCommentsCountChange?.(movieId, updated.length);
        return updated;
      });
    } catch (err) {
      showToast(err.message || 'Erro ao excluir comentário.', 'error');
    }
  };

  if (!movie) return null;

  return (
    <div
      id="comments-modal"
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog" style={{ maxWidth: '640px' }}>
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header">
            <div className="modal-movie-info">
              {movie.poster_url ? (
                <img
                  id="modal-poster"
                  src={movie.poster_url}
                  alt={movie.title}
                  className="modal-poster-thumb"
                />
              ) : (
                <div className="modal-poster-thumb-placeholder">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                    <line x1="7" y1="2" x2="7" y2="22" />
                    <line x1="17" y1="2" x2="17" y2="22" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                  </svg>
                </div>
              )}
              <div>
                <h3 id="modal-title" className="modal-movie-title">
                  {movie.title}
                </h3>
                <p id="modal-year" className="modal-movie-meta">
                  {movie.release_year || 'Ano N/A'} &bull; Tom Hanks
                </p>
              </div>
            </div>
            <button
              id="btn-close-modal"
              className="modal-close-btn"
              title="Fechar (Esc)"
              onClick={onClose}
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            <div className="privacy-note">
              <p style={{ margin: 0 }}>
                Compartilhe suas notas sobre este filme. Autores podem remover seus próprios comentários e Administradores possuem moderação global.
              </p>
            </div>

            {/* Add Comment Form */}
            <form id="form-add-comment" className="comment-form" onSubmit={handleAddComment}>
              <div className="form-group">
                <label htmlFor="comment-text">Adicionar nota ou comentário:</label>
                <textarea
                  id="comment-text"
                  className="form-control comment-textarea"
                  rows="3"
                  placeholder="Escreva sua análise ou impressão sobre o filme..."
                  required
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
              </div>
              <div className="form-action-right">
                <button
                  type="submit"
                  id="btn-save-comment"
                  className="btn btn-primary btn-sm"
                  disabled={saving || !commentText.trim()}
                >
                  <span>{saving ? 'Publicando...' : 'Publicar Comentário'}</span>
                </button>
              </div>
            </form>

            <hr className="modal-divider" />

            {/* Comments List */}
            <div className="comments-section">
              <h4 className="comments-list-title">
                Comentários (
                <span id="modal-comments-count">
                  {loading ? '...' : comments.length}
                </span>
                )
              </h4>

              {loading ? (
                <div className="text-center" style={{ padding: '2rem 0' }}>
                  <div className="spinner" />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Carregando...</p>
                </div>
              ) : error ? (
                <div className="alert alert-danger text-xs">
                  <span>Erro: {error}</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="empty-comments-box">
                  Nenhum comentário registrado ainda. Seja o primeiro!
                </div>
              ) : (
                <div id="comments-list" className="comments-list">
                  {comments.map((comment) => {
                    const isAuthor = user && user.id === comment.usuario_id;
                    const isAdmin = user && user.role === 'admin';
                    const canDelete = isAuthor || isAdmin;
                    const isModeration = !isAuthor && isAdmin;

                    return (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-item-content">
                          <div className="comment-author-header">
                            <button
                              type="button"
                              className="comment-author-btn"
                              title={`Ver perfil de ${comment.usuario_nome || 'Usuário'}`}
                              onClick={() => {
                                window.dispatchEvent(
                                  new CustomEvent('app:open-profile', {
                                    detail: { userId: comment.usuario_id }
                                  })
                                );
                              }}
                            >
                              {comment.foto_url ? (
                                <img
                                  src={comment.foto_url}
                                  alt={comment.usuario_nome}
                                  className="comment-avatar-img"
                                />
                              ) : (
                                <span className="comment-avatar-fallback">
                                  {(comment.usuario_nome || 'U').charAt(0).toUpperCase()}
                                </span>
                              )}
                              <span className="comment-author-name-text">
                                {comment.usuario_nome || 'Usuário'}
                              </span>
                            </button>

                            {isAuthor && (
                              <span className="comment-author-tag">
                                Você
                              </span>
                            )}

                            <span className={`badge-role badge-${comment.usuario_role || 'usuario'}`}>
                              {comment.usuario_role === 'admin' ? 'Admin' : 'Usuário'}
                            </span>

                            <div className="comment-date">
                              {formatDate(comment.criado_em)}
                            </div>
                          </div>

                          <p className="comment-text">{comment.texto}</p>
                        </div>

                        {canDelete && (
                          <button
                            className={`btn-delete-comment ${isModeration ? 'admin-moderation' : ''}`}
                            title={
                              isModeration
                                ? 'Moderação de Administrador: Excluir comentário de outro usuário'
                                : 'Excluir seu comentário'
                            }
                            aria-label={
                              isModeration
                                ? 'Excluir comentário de outro usuário como administrador'
                                : 'Excluir comentário'
                            }
                            onClick={() => handleDeleteComment(comment.id, isModeration)}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

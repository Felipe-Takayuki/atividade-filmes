import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function CommentsModal({ movie, onClose, onCommentsCountChange }) {
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

  // Carrega comentários ao abrir o modal ou trocar de filme
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

  // Listener para fechar no Escape
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
      showToast('Comentário salvo com sucesso!', 'success');

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

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Deseja realmente excluir esta anotação?')) return;

    try {
      await api.deleteComment(commentId);
      showToast('Comentário removido.', 'info');

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
      <div className="modal-dialog">
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header">
            <div className="modal-movie-info">
              {movie.poster_url && (
                <img
                  id="modal-poster"
                  src={movie.poster_url}
                  alt={movie.title}
                  className="modal-poster-thumb"
                />
              )}
              <div>
                <h3 id="modal-title" className="modal-movie-title">
                  {movie.title}
                </h3>
                <p id="modal-year" className="modal-movie-meta">
                  {movie.release_year || 'Ano N/A'} · Tom Hanks
                </p>
              </div>
            </div>
            <button
              id="btn-close-modal"
              className="modal-close-btn"
              title="Fechar"
              onClick={onClose}
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            <div className="privacy-note">
              <span>🔒</span>
              <p>
                <strong>Anotações Pessoais:</strong> Estes comentários são visíveis exclusivamente
                na sua conta e salvos no MariaDB.
              </p>
            </div>

            {/* Add Comment Form */}
            <form id="form-add-comment" className="comment-form" onSubmit={handleAddComment}>
              <div className="form-group">
                <label htmlFor="comment-text">Adicionar comentário sobre este filme:</label>
                <textarea
                  id="comment-text"
                  className="form-control comment-textarea"
                  rows="3"
                  placeholder="Ex: Uma das melhores atuações do Tom Hanks! A cena do banco na praça é inesquecível..."
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
                  disabled={saving}
                >
                  <span>{saving ? 'Salvando...' : 'Salvar Comentário'}</span>
                </button>
              </div>
            </form>

            <hr className="modal-divider" />

            {/* Comments List */}
            <div className="comments-section">
              <h4 className="comments-list-title">
                Seus Comentários (
                <span id="modal-comments-count">
                  {loading ? '...' : comments.length}
                </span>
                )
              </h4>

              {loading ? (
                <div className="text-center" style={{ padding: '1.5rem 0' }}>
                  <div className="spinner" />
                </div>
              ) : error ? (
                <div className="alert alert-danger text-xs">Erro: {error}</div>
              ) : comments.length === 0 ? (
                <div
                  className="text-center text-muted text-xs"
                  style={{ padding: '1.5rem 0' }}
                >
                  Nenhum comentário adicionado ainda. Escreva suas anotações acima!
                </div>
              ) : (
                <div id="comments-list" className="comments-list">
                  {comments.map((comment) => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-item-content">
                        <p className="comment-text">{comment.texto}</p>
                        <div className="comment-date">📅 {formatDate(comment.criado_em)}</div>
                      </div>
                      <button
                        className="btn-delete-comment"
                        title="Excluir este comentário"
                        aria-label="Excluir comentário"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <svg
                          width="15"
                          height="15"
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

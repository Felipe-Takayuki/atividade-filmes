import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function AuditLogsModal({ isOpen, onClose }) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadLogs = async (acao = filterAction) => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({ limit: 100, acao: acao || undefined });
      setLogs(res.logs || []);
      if (res.stream_stats) {
        setStats(res.stream_stats);
      }
    } catch (err) {
      console.error('Erro ao carregar logs de auditoria:', err);
      showToast(err.message || 'Erro ao consultar logs de auditoria.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs(filterAction);
    }
  }, [isOpen, filterAction]);

  if (!isOpen) return null;

  const getActionBadge = (acao) => {
    switch (acao) {
      case 'login':
        return (
          <span className="status-pill status-pill-success">
            <span className="status-dot" />
            Login
          </span>
        );
      case 'logout':
        return (
          <span className="status-pill status-pill-neutral">
            <span className="status-dot" />
            Logout
          </span>
        );
      case 'favoritar_filme':
        return (
          <span className="status-pill status-pill-warning">
            <span className="status-dot" />
            Favoritar
          </span>
        );
      case 'desfavoritar_filme':
        return (
          <span className="status-pill status-pill-muted">
            <span className="status-dot" />
            Desfavoritar
          </span>
        );
      case 'comentar':
        return (
          <span className="status-pill status-pill-info">
            <span className="status-dot" />
            Comentar
          </span>
        );
      case 'apagar_comentario':
        return (
          <span className="status-pill status-pill-danger">
            <span className="status-dot" />
            Apagar Comentário
          </span>
        );
      case 'acao_negada_403':
        return (
          <span className="status-pill status-pill-alert">
            <span className="status-dot" />
            403 Proibido
          </span>
        );
      case 'promover_admin':
        return (
          <span className="status-pill status-pill-purple">
            <span className="status-dot" />
            Promover Admin
          </span>
        );
      default:
        return (
          <span className="status-pill status-pill-neutral">
            <span className="status-dot" />
            {acao}
          </span>
        );
    }
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      id="audit-logs-modal"
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog" style={{ maxWidth: '960px', width: '96%' }}>
        <div className="modal-content" style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="modal-icon-badge modal-icon-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div>
                <h3 className="modal-movie-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                  Logs de Auditoria
                </h3>
                <p className="modal-movie-meta" style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0' }}>
                  Observabilidade em tempo real com Redis Streams (XADD / XREVRANGE)
                </p>
              </div>
            </div>
            <button
              id="btn-close-audit-logs"
              className="modal-close-btn"
              title="Fechar (Esc)"
              onClick={onClose}
            >
              &times;
            </button>
          </div>

          {/* Subheader / Controles */}
          <div className="audit-controls-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <label htmlFor="filter-action" style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
                Filtrar:
              </label>
              <select
                id="filter-action"
                className="form-control"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.85rem',
                  width: 'auto'
                }}
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="">Todas as Ações</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="favoritar_filme">Favoritar Filme</option>
                <option value="desfavoritar_filme">Desfavoritar Filme</option>
                <option value="comentar">Comentar</option>
                <option value="apagar_comentario">Apagar Comentário</option>
                <option value="acao_negada_403">403 Proibido</option>
                <option value="promover_admin">Promover Admin</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              {stats && (
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Stream: <code style={{ color: '#94a3b8' }}>{stats.stream_key}</code> ({stats.total_events} eventos)
                </span>
              )}
              <button
                id="btn-refresh-logs"
                className="btn btn-secondary btn-sm"
                onClick={() => loadLogs(filterAction)}
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: loading ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s' }}>
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <span>{loading ? 'Consultando...' : 'Atualizar'}</span>
              </button>
            </div>
          </div>

          {/* Body / Tabela */}
          <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.5rem' }}>
            {loading && logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                <p>Consultando eventos no Redis Streams...</p>
              </div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Nenhum evento registrado.
                </p>
                <p style={{ fontSize: '0.85rem' }}>
                  Ações como login, favoritar filme ou comentar serão registradas automaticamente.
                </p>
              </div>
            ) : (
              <div className="audit-table-container">
                <table id="table-audit-logs" className="audit-table">
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: 'nowrap' }}>Data & Hora</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Ação</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Usuário</th>
                      <th style={{ whiteSpace: 'nowrap' }}>IP Origem</th>
                      <th>Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className={item.acao === 'acao_negada_403' ? 'row-403' : ''}
                      >
                        <td style={{ whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '0.825rem', fontFamily: 'monospace' }}>
                          {formatTimestamp(item.timestamp)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {getActionBadge(item.acao)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 500, color: '#f8fafc' }}>
                            ID: {item.usuario_id}
                          </span>
                          {item.usuario_email && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {item.usuario_email}
                            </div>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <code className="code-ip">
                            {item.ip || '127.0.0.1'}
                          </code>
                        </td>
                        <td>
                          {typeof item.detalhes === 'object' ? (
                            <pre className="audit-json-box">
                              {JSON.stringify(item.detalhes, null, 1)}
                            </pre>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.825rem' }}>
                              {item.detalhes || '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
              Exibindo <strong>{logs.length}</strong> eventos
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

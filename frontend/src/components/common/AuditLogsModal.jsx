import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function AuditLogsModal({ isOpen, onClose }) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('');
  const [stats, setStats] = useState(null);

  // Fecha no Escape
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
        return <span className="badge-role badge-action-login">🔑 Login</span>;
      case 'logout':
        return <span className="badge-role badge-action-logout">🚪 Logout</span>;
      case 'favoritar_filme':
        return <span className="badge-role badge-action-fav">⭐ Favoritar</span>;
      case 'desfavoritar_filme':
        return <span className="badge-role badge-action-unfav">☆ Desfavoritar</span>;
      case 'comentar':
        return <span className="badge-role badge-action-comment">💬 Comentar</span>;
      case 'apagar_comentario':
        return <span className="badge-role badge-action-delete">🗑️ Apagar</span>;
      case 'acao_negada_403':
        return (
          <span className="badge-role badge-action-403">
            🚫 403 Proibido
          </span>
        );
      case 'promover_admin':
        return <span className="badge-role badge-action-promote">👑 Promover Admin</span>;
      default:
        return <span className="badge-role badge-action-default">{acao}</span>;
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.08))',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  boxShadow: '0 0 16px rgba(59, 130, 246, 0.2)',
                  fontSize: '1.35rem'
                }}
              >
                📋
              </div>
              <div>
                <h3 className="modal-movie-title" style={{ fontSize: '1.25rem', margin: 0 }}>
                  Logs de Auditoria do Sistema
                </h3>
                <p className="modal-movie-meta" style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0' }}>
                  ISW055 · Observabilidade em Tempo Real via Redis Streams (XADD / XREVRANGE)
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
              <label htmlFor="filter-action" style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>
                Filtrar Ação:
              </label>
              <select
                id="filter-action"
                className="form-control"
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.85rem',
                  width: 'auto',
                  background: 'rgba(7, 10, 18, 0.85)',
                  borderColor: 'rgba(255, 255, 255, 0.15)'
                }}
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
              >
                <option value="">Todas as Ações</option>
                <option value="login">🔑 Login</option>
                <option value="logout">🚪 Logout</option>
                <option value="favoritar_filme">⭐ Favoritar Filme</option>
                <option value="desfavoritar_filme">☆ Desfavoritar Filme</option>
                <option value="comentar">💬 Comentar</option>
                <option value="apagar_comentario">🗑️ Apagar Comentário</option>
                <option value="acao_negada_403">🚫 403 Proibido (Tentativas Negadas)</option>
                <option value="promover_admin">👑 Promover Admin</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              {stats && (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Stream: <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#93c5fd' }}>{stats.stream_key}</code> ({stats.total_events} gravados)
                </span>
              )}
              <button
                id="btn-refresh-logs"
                className="btn btn-secondary btn-sm"
                onClick={() => loadLogs(filterAction)}
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <span style={{ display: 'inline-block', transform: loading ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s' }}>🔄</span>
                <span>{loading ? 'Consultando...' : 'Atualizar'}</span>
              </button>
            </div>
          </div>

          {/* Body / Tabela */}
          <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.75rem' }}>
            {loading && logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
                <div className="spinner" style={{ margin: '0 auto 1.25rem' }} />
                <p style={{ fontWeight: 600 }}>Consultando eventos no Redis Streams...</p>
              </div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94a3b8' }}>
                <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
                  Nenhum evento registrado no momento.
                </p>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Realize ações como login, favoritar filme ou comentar para gerar logs de auditoria.
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
                      <th>Detalhes do Evento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        className={item.acao === 'acao_negada_403' ? 'row-403' : ''}
                      >
                        <td style={{ whiteSpace: 'nowrap', color: '#e2e8f0', fontSize: '0.825rem' }}>
                          {formatTimestamp(item.timestamp)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {getActionBadge(item.acao)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                            ID: {item.usuario_id}
                          </span>
                          {item.usuario_email && (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {item.usuario_email}
                            </div>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <code
                            style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.25)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              color: '#93c5fd',
                              fontSize: '0.775rem'
                            }}
                          >
                            {item.ip || '127.0.0.1'}
                          </code>
                        </td>
                        <td>
                          {typeof item.detalhes === 'object' ? (
                            <pre className="audit-json-box">
                              {JSON.stringify(item.detalhes, null, 1)}
                            </pre>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '0.825rem' }}>
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
              Exibindo <strong>{logs.length}</strong> eventos mais recentes gravados no Redis Streams
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

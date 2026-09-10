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
        return <span className="badge-role" style={{ background: '#059669', color: '#fff' }}>🔑 Login</span>;
      case 'logout':
        return <span className="badge-role" style={{ background: '#475569', color: '#cbd5e1' }}>🚪 Logout</span>;
      case 'favoritar_filme':
        return <span className="badge-role" style={{ background: '#d97706', color: '#fff' }}>⭐ Favoritar</span>;
      case 'desfavoritar_filme':
        return <span className="badge-role" style={{ background: '#78716c', color: '#f5f5f4' }}>☆ Desfavoritar</span>;
      case 'comentar':
        return <span className="badge-role" style={{ background: '#2563eb', color: '#fff' }}>💬 Comentar</span>;
      case 'apagar_comentario':
        return <span className="badge-role" style={{ background: '#dc2626', color: '#fff' }}>🗑️ Apagar Comentário</span>;
      case 'acao_negada_403':
        return (
          <span
            className="badge-role"
            style={{
              background: '#991b1b',
              color: '#fef2f2',
              fontWeight: 700,
              boxShadow: '0 0 8px rgba(220, 38, 38, 0.4)'
            }}
          >
            🚫 403 Proibido
          </span>
        );
      case 'promover_admin':
        return <span className="badge-role" style={{ background: '#9333ea', color: '#fff' }}>👑 Promover Admin</span>;
      default:
        return <span className="badge-role" style={{ background: '#334155', color: '#cbd5e1' }}>{acao}</span>;
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
      <div className="modal-dialog" style={{ maxWidth: '920px', width: '95%' }}>
        <div className="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📋</span>
              <div>
                <h3 className="modal-movie-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                  Logs de Auditoria do Sistema
                </h3>
                <p className="modal-movie-meta" style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                  ISW055 · Observabilidade em Tempo Real via Redis Streams (XADD / XREVRANGE)
                </p>
              </div>
            </div>
            <button
              id="btn-close-audit-logs"
              className="modal-close-btn"
              title="Fechar"
              onClick={onClose}
            >
              &times;
            </button>
          </div>

          {/* Subheader / Controles */}
          <div
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(15, 23, 42, 0.6)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="filter-action" style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                Filtrar Ação:
              </label>
              <select
                id="filter-action"
                className="form-control"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', width: 'auto' }}
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
                <option value="acao_negada_403">🚫 403 Proibido (Tentativas Negadas)</option>
                <option value="promover_admin">👑 Promover Admin</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {stats && (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Stream: <code>{stats.stream_key}</code> ({stats.total_events} gravados)
                </span>
              )}
              <button
                id="btn-refresh-logs"
                className="btn btn-secondary btn-sm"
                onClick={() => loadLogs(filterAction)}
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <span>🔄</span>
                <span>{loading ? 'Carregando...' : 'Atualizar'}</span>
              </button>
            </div>
          </div>

          {/* Body / Tabela */}
          <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.5rem' }}>
            {loading && logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                <p>Consultando eventos no Redis Streams...</p>
              </div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
                <p style={{ fontSize: '1rem', fontWeight: 600 }}>Nenhum evento registrado no momento.</p>
                <p style={{ fontSize: '0.85rem' }}>Realize ações como login, favoritar filme ou comentar para gerar logs.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  id="table-audit-logs"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.85rem',
                    textAlign: 'left'
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', color: '#94a3b8' }}>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Data & Hora</th>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Ação</th>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Usuário</th>
                      <th style={{ padding: '0.6rem 0.5rem' }}>IP Origem</th>
                      <th style={{ padding: '0.6rem 0.5rem' }}>Detalhes do Evento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((item, idx) => (
                      <tr
                        key={item.id || idx}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                          background: item.acao === 'acao_negada_403' ? 'rgba(239, 68, 68, 0.06)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '0.65rem 0.5rem', whiteSpace: 'nowrap', color: '#e2e8f0' }}>
                          {formatTimestamp(item.timestamp)}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}>
                          {getActionBadge(item.acao)}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                            ID: {item.usuario_id}
                          </span>
                          {item.usuario_email && (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {item.usuario_email}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', whiteSpace: 'nowrap', color: '#a5b4fc', fontFamily: 'monospace' }}>
                          {item.ip || '127.0.0.1'}
                        </td>
                        <td style={{ padding: '0.65rem 0.5rem', color: '#cbd5e1' }}>
                          {typeof item.detalhes === 'object' ? (
                            <pre
                              style={{
                                margin: 0,
                                fontSize: '0.75rem',
                                background: 'rgba(0, 0, 0, 0.3)',
                                padding: '0.25rem 0.4rem',
                                borderRadius: '4px',
                                maxWidth: '340px',
                                overflowX: 'auto'
                              }}
                            >
                              {JSON.stringify(item.detalhes, null, 1)}
                            </pre>
                          ) : (
                            <span>{item.detalhes || '-'}</span>
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
          <div
            className="modal-footer"
            style={{
              padding: '0.75rem 1.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Exibindo {logs.length} eventos mais recentes
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

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function AdminPromoteModal({ isOpen, onClose }) {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Fecha no Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reseta estado ao abrir
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.promoteUser(cleanEmail);
      const msg = res.message || `Usuário promovido para Administrador com sucesso!`;
      setSuccessMsg(msg);
      showToast(msg, 'success');
      setEmail('');
    } catch (err) {
      const errMsg = err.message || 'Erro ao promover usuário.';
      setError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="promote-admin-modal"
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog" style={{ maxWidth: '520px' }}>
        <div className="modal-content">
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
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(217, 119, 6, 0.08))',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  boxShadow: '0 0 16px rgba(245, 158, 11, 0.2)',
                  fontSize: '1.35rem'
                }}
              >
                👑
              </div>
              <div>
                <h3 className="modal-movie-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                  Promover Usuário a Administrador
                </h3>
                <p className="modal-movie-meta" style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0' }}>
                  Controle de Acesso por Papel (RBAC) &bull; Microsserviço de Auth
                </p>
              </div>
            </div>
            <button
              id="btn-close-promote-modal"
              className="modal-close-btn"
              title="Fechar (Esc)"
              onClick={onClose}
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            <div
              className="privacy-note"
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05))',
                borderColor: 'rgba(245, 158, 11, 0.3)',
                color: '#fbbf24',
                marginBottom: '1.25rem'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>👑</span>
              <p style={{ margin: 0 }}>
                <strong>Ação Administrativa:</strong> Conceda privilégios de administrador para um usuário já cadastrado. Administradores podem moderar comentários e visualizar os logs de auditoria no Redis Streams.
              </p>
            </div>

            {error && (
              <div className="alert alert-danger text-xs">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="alert alert-success text-xs">
                <span>✅</span>
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '0.75rem' }}>
              <div className="form-group">
                <label htmlFor="promote-email">
                  E-mail do Usuário Cadastrado:
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">✉️</span>
                  <input
                    type="email"
                    id="promote-email"
                    className="form-control"
                    placeholder="ex: colega@exemplo.com"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginTop: '1.75rem',
                  justifyContent: 'flex-end'
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  id="btn-confirm-promote"
                  className="btn btn-primary btn-sm"
                  disabled={submitting || !email.trim()}
                >
                  <span>{submitting ? 'Promovendo no Microsserviço...' : '👑 Promover para Admin'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function AdminPromoteModal({ isOpen, onClose }) {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      <div className="modal-dialog" style={{ maxWidth: '480px' }}>
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="modal-icon-badge modal-icon-gold">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z" />
                </svg>
              </div>
              <div>
                <h3 className="modal-movie-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                  Promover para Administrador
                </h3>
                <p className="modal-movie-meta" style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0' }}>
                  Controle de Acesso por Papel (RBAC)
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
            <div className="privacy-note">
              <p style={{ margin: 0 }}>
                Conceda privilégios de administrador para um usuário cadastrado. Administradores podem moderar comentários e visualizar os logs de auditoria.
              </p>
            </div>

            {error && (
              <div className="alert alert-danger text-xs">
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="alert alert-success text-xs">
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '0.75rem' }}>
              <div className="form-group">
                <label htmlFor="promote-email">
                  E-mail do Usuário:
                </label>
                <div className="input-wrapper">
                  <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    type="email"
                    id="promote-email"
                    className="form-control"
                    placeholder="colega@exemplo.com"
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
                  marginTop: '1.5rem',
                  justifyContent: 'flex-end'
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-confirm-promote"
                  className="btn btn-primary btn-sm"
                  disabled={submitting || !email.trim()}
                >
                  <span>{submitting ? 'Promovendo...' : 'Promover Usuário'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

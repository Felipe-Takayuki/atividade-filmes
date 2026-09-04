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
      <div className="modal-dialog" style={{ maxWidth: '480px' }}>
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.4rem' }}>👑</span>
              <div>
                <h3 className="modal-movie-title" style={{ fontSize: '1.1rem' }}>
                  Promover Usuário a Administrador
                </h3>
                <p className="modal-movie-meta" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Controle de Acesso por Papel (RBAC)
                </p>
              </div>
            </div>
            <button
              id="btn-close-promote-modal"
              className="modal-close-btn"
              title="Fechar"
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
                background: 'rgba(234, 179, 8, 0.08)',
                borderColor: 'rgba(234, 179, 8, 0.25)',
                marginBottom: '1rem'
              }}
            >
              <span>ℹ️</span>
              <p>
                <strong>Ação Exclusiva de Admin:</strong> Informe o e-mail de um usuário cadastrado
                para conceder privilégios administrativos (como moderação global de comentários).
              </p>
            </div>

            {error && (
              <div className="alert alert-danger text-xs" style={{ marginBottom: '1rem' }}>
                ⚠️ {error}
              </div>
            )}

            {successMsg && (
              <div className="alert alert-success text-xs" style={{ marginBottom: '1rem' }}>
                ✅ {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '0.5rem' }}>
              <div className="form-group">
                <label htmlFor="promote-email" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
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
                  marginTop: '1.25rem',
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
                  style={{
                    background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                    borderColor: '#ca8a04',
                    color: '#0f172a',
                    fontWeight: 700
                  }}
                  disabled={submitting || !email.trim()}
                >
                  <span>{submitting ? 'Promovendo...' : '👑 Promover para Admin'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

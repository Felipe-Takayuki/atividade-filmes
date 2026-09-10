import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminPromoteModal } from './AdminPromoteModal';
import { AuditLogsModal } from './AuditLogsModal';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  return (
    <>
      <header className="navbar">
        <div className="container navbar-container">
          <div className="brand">
            <div className="brand-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                <line x1="7" y1="2" x2="7" y2="22" />
                <line x1="17" y1="2" x2="17" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="2" y1="7" x2="7" y2="7" />
                <line x1="2" y1="17" x2="7" y2="17" />
                <line x1="17" y1="17" x2="22" y2="17" />
                <line x1="17" y1="7" x2="22" y2="7" />
              </svg>
            </div>
            <div className="brand-text">
              <span className="brand-title">Tom Hanks</span>
              <span className="brand-subtitle">Catálogo Cinematográfico</span>
            </div>
          </div>

          {/* User Menu (Exibido quando autenticado) */}
          {isAuthenticated && user && (
            <div id="user-nav" className="user-nav">
              <div className="user-badge">
                <span className="avatar-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <span id="nav-user-name" className="user-name">
                  {user.nome || 'Usuário'}
                </span>
                <span
                  id="nav-user-role"
                  className={`badge-role badge-${user.role || 'usuario'}`}
                >
                  {user.role === 'admin' ? (
                    <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                      </svg>
                      <span>Admin</span>
                    </>
                  ) : (
                    <span>Usuário</span>
                  )}
                </span>
              </div>

              {/* Botões exclusivos de Administrador */}
              {user.role === 'admin' && (
                <>
                  <button
                    id="btn-open-logs-modal"
                    className="btn btn-ghost-admin btn-sm"
                    title="Consultar Logs de Auditoria (Redis Streams)"
                    onClick={() => setShowLogsModal(true)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    <span>Logs de Auditoria</span>
                  </button>

                  <button
                    id="btn-open-promote-modal"
                    className="btn btn-ghost-admin btn-sm"
                    title="Promover usuário para Administrador por e-mail"
                    onClick={() => setShowPromoteModal(true)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
                    </svg>
                    <span>Promover Admin</span>
                  </button>
                </>
              )}

              <button
                id="btn-logout"
                className="btn btn-ghost-danger btn-sm"
                title="Sair da conta"
                onClick={logout}
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
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Modal de Promoção de Usuário para Admin */}
      <AdminPromoteModal
        isOpen={showPromoteModal}
        onClose={() => setShowPromoteModal(false)}
      />

      {/* Modal de Logs e Auditoria (Redis Streams) */}
      <AuditLogsModal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
      />
    </>
  );
}

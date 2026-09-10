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
              <span className="brand-icon">🎬</span>
            </div>
            <div className="brand-text">
              <span className="brand-title">Tom Hanks</span>
              <span className="brand-subtitle">Catálogo Cinematográfico & Autenticação Segura</span>
            </div>
          </div>

          {/* User Menu (Exibido quando autenticado) */}
          {isAuthenticated && user && (
            <div id="user-nav" className="user-nav">
              <div className="user-badge">
                <span className="avatar-icon">👤</span>
                <span id="nav-user-name" className="user-name">
                  {user.nome || 'Usuário'}
                </span>
                <span
                  id="nav-user-role"
                  className={`badge-role badge-${user.role || 'usuario'}`}
                >
                  {user.role === 'admin' ? '👑 Admin' : 'Usuário'}
                </span>
              </div>

              {/* Botões exclusivos de Administrador */}
              {user.role === 'admin' && (
                <>
                  <button
                    id="btn-open-logs-modal"
                    className="btn btn-outline-primary btn-sm"
                    title="Consultar Logs de Auditoria (Redis Streams)"
                    onClick={() => setShowLogsModal(true)}
                  >
                    <span>📋</span>
                    <span>Logs de Auditoria</span>
                  </button>

                  <button
                    id="btn-open-promote-modal"
                    className="btn btn-outline-warning btn-sm"
                    title="Promover usuário para Administrador por e-mail"
                    onClick={() => setShowPromoteModal(true)}
                  >
                    <span>👑</span>
                    <span>Promover Admin</span>
                  </button>
                </>
              )}

              <button
                id="btn-logout"
                className="btn btn-outline-danger btn-sm"
                title="Sair da conta"
                onClick={logout}
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

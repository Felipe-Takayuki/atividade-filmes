import React from 'react';
import { useAuth } from '../../context/AuthContext';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="container navbar-container">
        <div className="brand">
          <span className="brand-icon">🎬</span>
          <div className="brand-text">
            <span className="brand-title">Tom Hanks</span>
            <span className="brand-subtitle">Catálogo & Troca de Senha Segura</span>
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
                {user.role || 'usuario'}
              </span>
            </div>
            <button
              id="btn-logout"
              className="btn btn-outline-danger btn-sm"
              title="Sair da conta"
              onClick={logout}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
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
  );
}

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { ResetPasswordForm } from './ResetPasswordForm';

export function AuthView() {
  const { authTab, setAuthTab, authAlert } = useAuth();

  return (
    <section id="auth-view" className="view auth-section">
      <div className="container auth-container">
        {/* Left Hero */}
        <div className="auth-hero">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            Coleção Exclusiva
          </div>
          <h1 className="hero-title">
            Catálogo de filmes <span className="text-gold">Tom Hanks</span>
          </h1>
          <p className="hero-desc">
            Explore a filmografia completa, descubra sinopses, organize seus títulos
            favoritos e compartilhe sua opinião sobre cada produção.
          </p>

          <div className="hero-features">
            <div className="feature-item">
              <div className="feature-icon-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="feature-text">
                <strong>Conta Pessoal e Favoritos</strong>
                <p>Crie sua conta para salvar seus filmes favoritos e gerenciar sua lista pessoal.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon-box">
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
              <div className="feature-text">
                <strong>Filmografia Completa</strong>
                <p>Obras em alta definição com sinopses, personagens, anos de lançamento e avaliações.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="feature-text">
                <strong>Comunidade e Avaliações</strong>
                <p>Compartilhe suas notas sobre cada filme e veja as impressões da comunidade.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="auth-card">
          {authTab !== 'reset' && (
            <div id="auth-tabs" className="auth-tabs">
              <button
                id="tab-login"
                className={`tab-btn ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => setAuthTab('login')}
              >
                Entrar
              </button>
              <button
                id="tab-register"
                className={`tab-btn ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => setAuthTab('register')}
              >
                Criar Conta
              </button>
              <button
                id="tab-forgot"
                className={`tab-btn ${authTab === 'forgot' ? 'active' : ''}`}
                onClick={() => setAuthTab('forgot')}
              >
                Recuperar Senha
              </button>
            </div>
          )}

          {authAlert && (
            <div id="auth-alert" className={`alert alert-${authAlert.type || 'danger'}`}>
              <span className="alert-icon">
                {authAlert.type === 'success' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
              </span>
              <span>{authAlert.message}</span>
            </div>
          )}

          {/* Dynamic Forms */}
          {authTab === 'login' && <LoginForm />}
          {authTab === 'register' && <RegisterForm />}
          {authTab === 'forgot' && <ForgotPasswordForm />}
          {authTab === 'reset' && <ResetPasswordForm />}

          <div className="auth-footer">
            <p className="text-muted text-center text-xs">
              Serviço de Autenticação isolado &bull; <code>auth-service</code> na rede interna
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

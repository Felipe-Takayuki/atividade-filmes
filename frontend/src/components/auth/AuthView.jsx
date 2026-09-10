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
            ISW055 · Atividade 3 · Microsserviços
          </div>
          <h1 className="hero-title">
            Catálogo de filmes <span className="text-gold">Tom Hanks</span>
          </h1>
          <p className="hero-desc">
            Arquitetura desacoplada: autenticação isolada em microsserviço independente, catálogo TMDB
            em tempo real, controle de papéis (roles) e recuperação de senha com tokens de 30
            minutos via Brevo.
          </p>

          <div className="hero-features">
            <div className="feature-item">
              <span className="feature-icon">🛡️</span>
              <div className="feature-text">
                <strong>Microsserviço de Autenticação Isolado</strong>
                <p>JWT assinado com HS256, cookies HttpOnly e controle RBAC completo.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎬</span>
              <div className="feature-text">
                <strong>TMDB Live & Cache MariaDB</strong>
                <p>Pôsteres em alta definição, sinopses detalhadas, busca e favoritos.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <div className="feature-text">
                <strong>Observabilidade Redis Streams</strong>
                <p>Rastreamento de acessos, ações e moderação de comentários em tempo real.</p>
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
              <span>{authAlert.type === 'success' ? '✅' : '⚠️'}</span>
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
              Serviço de Autenticação isolado &bull; <code>auth-service</code> na rede interna Docker
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

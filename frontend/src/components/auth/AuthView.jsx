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
          <div className="hero-badge">ISW055 · Atividade 3 · Microsserviços</div>
          <h1 className="hero-title">
            Filmografia de <span className="text-gold">Tom Hanks</span>
          </h1>
          <p className="hero-desc">
            Arquitetura desacoplada: autenticação isolada em microsserviço independente, catálogo TMDB
            em tempo real, controle de papéis (roles) e recuperação de senha com tokens de 30
            minutos.
          </p>
          <div className="hero-features">
            <div className="feature-item">
              <span className="feature-icon">🔐</span>
              <span>Microsserviço de Login isolado na rede interna Docker</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">👥</span>
              <span>
                Suporte a papéis de usuário (<code>usuario</code> / <code>admin</code>)
              </span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">✉️</span>
              <span>Recuperação de senha real com Mailtrap e expiração de 30 min</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎬</span>
              <span>Favoritos e anotações pessoais isolados por usuário</span>
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
              {authAlert.message}
            </div>
          )}

          {/* Formulários Dinâmicos */}
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

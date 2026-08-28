import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export function LoginForm() {
  const { login, setAuthTab, showAlert } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !senha) {
      showAlert('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setSubmitting(true);
    try {
      await login(cleanEmail, senha);
    } catch (err) {
      showAlert(err.message || 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id="form-login" className="auth-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="login-email">E-mail</label>
        <div className="input-wrapper">
          <span className="input-icon">✉️</span>
          <input
            type="email"
            id="login-email"
            className="form-control"
            placeholder="seu.email@exemplo.com"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor="login-senha">Senha</label>
          <button
            type="button"
            id="btn-to-forgot"
            className="btn-link"
            onClick={() => setAuthTab('forgot')}
          >
            Esqueci minha senha
          </button>
        </div>
        <div className="input-wrapper">
          <span className="input-icon">🔑</span>
          <input
            type="password"
            id="login-senha"
            className="form-control"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        id="btn-submit-login"
        className="btn btn-primary btn-block"
        disabled={submitting}
      >
        <span>{submitting ? 'Autenticando...' : 'Entrar no Catálogo'}</span>
      </button>
    </form>
  );
}

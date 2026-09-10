import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export function ForgotPasswordForm() {
  const { forgotPassword, setAuthTab, showAlert } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      showAlert('Por favor, informe seu e-mail.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await forgotPassword(cleanEmail);
      showAlert(
        data.message ||
          'E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada (link válido por 30 minutos).',
        'success'
      );
      setEmail('');
    } catch (err) {
      showAlert(err.message || 'Erro ao solicitar recuperação de senha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id="form-forgot" className="auth-form" onSubmit={handleSubmit}>
      <div className="form-header-box">
        <h3 className="form-box-title">Recuperar Senha</h3>
        <p className="form-box-desc">
          Informe seu e-mail cadastrado. Enviaremos um link de redefinição com validade de{' '}
          <strong>30 minutos</strong>.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="forgot-email">Seu E-mail Cadastrado</label>
        <div className="input-wrapper">
          <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <input
            type="email"
            id="forgot-email"
            className="form-control"
            placeholder="seu.email@exemplo.com"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        id="btn-submit-forgot"
        className="btn btn-primary btn-block"
        disabled={submitting}
      >
        <span>{submitting ? 'Enviando...' : 'Enviar Link de Recuperação'}</span>
      </button>

      <div className="form-footer-action">
        <button
          type="button"
          id="btn-forgot-to-login"
          className="btn-link"
          onClick={() => setAuthTab('login')}
        >
          ← Voltar para o Login
        </button>
      </div>
    </form>
  );
}

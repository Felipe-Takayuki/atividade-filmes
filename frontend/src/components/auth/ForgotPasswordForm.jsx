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
          <strong>30 minutos</strong> via Brevo.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="forgot-email">Seu E-mail Cadastrado</label>
        <div className="input-wrapper">
          <span className="input-icon">✉️</span>
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
        <span>{submitting ? 'Enviando e-mail via Brevo...' : 'Enviar Link de Recuperação'}</span>
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

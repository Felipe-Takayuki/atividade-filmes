import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export function ResetPasswordForm() {
  const { resetPassword, cancelReset, resetEmail, showAlert, setAuthTab } = useAuth();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!novaSenha || !confirmSenha) {
      showAlert('Preencha os dois campos de senha.');
      return;
    }

    if (novaSenha !== confirmSenha) {
      showAlert('As senhas digitadas não coincidem. Digite a mesma senha nos dois campos.');
      return;
    }

    if (novaSenha.length < 4) {
      showAlert('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await resetPassword(novaSenha);
      showAlert(
        data.message || 'Senha alterada com sucesso! Você já pode entrar com sua nova senha.',
        'success'
      );
      setNovaSenha('');
      setConfirmSenha('');

      setTimeout(() => {
        setAuthTab('login');
      }, 2000);
    } catch (err) {
      showAlert(
        err.message ||
          'Falha ao redefinir a senha. O link pode ter expirado (30 min) ou já ter sido usado.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id="form-reset" className="auth-form" onSubmit={handleSubmit}>
      <div className="form-header-box">
        <h3 className="form-box-title">Redefinir Senha</h3>
        <p id="reset-account-info" className="form-box-desc">
          {resetEmail ? (
            <>
              Definindo nova senha para a conta: <strong>{resetEmail}</strong>
            </>
          ) : (
            'Informe a nova senha para sua conta.'
          )}
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="reset-senha">Nova Senha</label>
        <div className="input-wrapper">
          <span className="input-icon">🔑</span>
          <input
            type="password"
            id="reset-senha"
            className="form-control"
            placeholder="Mínimo 4 caracteres"
            required
            autoComplete="new-password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="reset-senha-confirm">Confirmar Nova Senha</label>
        <div className="input-wrapper">
          <span className="input-icon">🔒</span>
          <input
            type="password"
            id="reset-senha-confirm"
            className="form-control"
            placeholder="Repita a nova senha"
            required
            autoComplete="new-password"
            value={confirmSenha}
            onChange={(e) => setConfirmSenha(e.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        id="btn-submit-reset"
        className="btn btn-primary btn-block"
        disabled={submitting}
      >
        <span>{submitting ? 'Atualizando senha no Microsserviço...' : 'Salvar Nova Senha'}</span>
      </button>

      <div className="form-footer-action">
        <button
          type="button"
          id="btn-reset-to-login"
          className="btn-link"
          onClick={cancelReset}
        >
          ← Voltar para o Login
        </button>
      </div>
    </form>
  );
}

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export function RegisterForm() {
  const { register, showAlert } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanNome = nome.trim();
    const cleanEmail = email.trim();

    if (!cleanNome || !cleanEmail || !senha) {
      showAlert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (senha.length < 4) {
      showAlert('A senha deve conter no mínimo 4 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await register(cleanNome, cleanEmail, senha);
    } catch (err) {
      showAlert(err.message || 'Falha ao criar conta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id="form-register" className="auth-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="register-nome">Nome Completo</label>
        <div className="input-wrapper">
          <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <input
            type="text"
            id="register-nome"
            className="form-control"
            placeholder="Seu nome"
            required
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="register-email">E-mail</label>
        <div className="input-wrapper">
          <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          <input
            type="email"
            id="register-email"
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
        <label htmlFor="register-senha">Senha de Acesso</label>
        <div className="input-wrapper">
          <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <input
            type="password"
            id="register-senha"
            className="form-control"
            placeholder="Mínimo 4 caracteres"
            required
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        id="btn-submit-register"
        className="btn btn-primary btn-block"
        disabled={submitting}
      >
        <span>{submitting ? 'Criando conta...' : 'Criar Conta'}</span>
      </button>
    </form>
  );
}

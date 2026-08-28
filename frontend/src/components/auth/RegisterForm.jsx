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
          <span className="input-icon">👤</span>
          <input
            type="text"
            id="register-nome"
            className="form-control"
            placeholder="Ex: Allan Siriani"
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
          <span className="input-icon">✉️</span>
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
          <span className="input-icon">🔑</span>
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
        <span>{submitting ? 'Cadastrando no Microsserviço...' : 'Criar Minha Conta'}</span>
      </button>
    </form>
  );
}

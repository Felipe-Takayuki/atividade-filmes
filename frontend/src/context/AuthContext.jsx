import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => api.getUser());
  const [token, setToken] = useState(() => api.getToken());
  const [loading, setLoading] = useState(true);
  const [authTab, setAuthTabState] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [authAlert, setAuthAlert] = useState(null); // { message, type: 'danger'|'success'|'info' }
  const [resetToken, setResetToken] = useState(null);
  const [resetEmail, setResetEmail] = useState('');

  const clearAlert = useCallback(() => {
    setAuthAlert(null);
  }, []);

  const showAlert = useCallback((message, type = 'danger') => {
    setAuthAlert({ message, type });
  }, []);

  const setAuthTab = useCallback((tab) => {
    clearAlert();
    setAuthTabState(tab);
  }, [clearAlert]);

  // Checa token de recuperação na URL (Query Params ou Hash)
  const checkUrlResetToken = useCallback(async () => {
    let extractedToken = null;

    // 1. Hash (#reset-token=XYZ)
    const hash = window.location.hash;
    if (hash.includes('reset-token=')) {
      const match = hash.match(/reset-token=([^&]+)/);
      if (match) extractedToken = match[1];
    }

    // 2. Query Params (?token=XYZ ou ?reset-token=XYZ ou ?reset_token=XYZ)
    if (!extractedToken) {
      const urlParams = new URLSearchParams(window.location.search);
      extractedToken = urlParams.get('reset-token') || urlParams.get('token') || urlParams.get('reset_token');
    }

    if (extractedToken) {
      setResetToken(extractedToken);
      setAuthTabState('reset');
      showAlert('Validando link de recuperação junto ao microsserviço...', 'info');

      try {
        const result = await api.verifyResetToken(extractedToken);
        if (result.valid) {
          setResetEmail(result.email || '');
          showAlert('Link verificado com sucesso! Digite sua nova senha abaixo.', 'success');
        } else {
          showAlert(result.error || 'Este link de recuperação é inválido ou expirou após 30 minutos.', 'danger');
          setResetEmail('');
        }
      } catch (err) {
        showAlert(err.message || 'Este link de recuperação é inválido, expirou após 30 minutos ou já foi utilizado.', 'danger');
        setResetEmail('');
      }
      return true;
    }
    return false;
  }, [showAlert]);

  // Inicialização de sessão e verificação de autenticação
  useEffect(() => {
    async function init() {
      const hasTokenInUrl = await checkUrlResetToken();
      if (!hasTokenInUrl) {
        const savedToken = api.getToken();
        const savedUser = api.getUser();

        if (savedToken && savedUser) {
          try {
            const res = await api.me();
            setUser(res.user);
            setToken(savedToken);
          } catch {
            api.clearSession();
            setUser(null);
            setToken(null);
          }
        }
      }
      setLoading(false);
    }

    init();

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      setAuthTabState('login');
      showAlert('Sua sessão expirou. Faça login novamente.', 'danger');
    };

    const handleHashChange = () => {
      checkUrlResetToken();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [checkUrlResetToken, showAlert]);

  const login = async (email, senha) => {
    clearAlert();
    const data = await api.login(email, senha);
    setUser(data.user);
    setToken(data.token);
    return data;
  };

  const register = async (nome, email, senha) => {
    clearAlert();
    const data = await api.register(nome, email, senha);
    setUser(data.user);
    setToken(data.token);
    return data;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setToken(null);
    setAuthTabState('login');
    clearAlert();
  };

  const forgotPassword = async (email) => {
    clearAlert();
    return await api.forgotPassword(email);
  };

  const resetPassword = async (newPassword) => {
    clearAlert();
    if (!resetToken) {
      throw new Error('Token de recuperação não identificado. Solicite um novo link.');
    }
    const data = await api.resetPassword(resetToken, newPassword);
    
    // Limpa token da URL
    history.replaceState(null, '', window.location.pathname);
    setResetToken(null);
    setResetEmail('');
    return data;
  };

  const cancelReset = () => {
    history.replaceState(null, '', window.location.pathname);
    setResetToken(null);
    setResetEmail('');
    setAuthTab('login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        loading,
        authTab,
        setAuthTab,
        authAlert,
        showAlert,
        clearAlert,
        resetToken,
        resetEmail,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        cancelReset
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}

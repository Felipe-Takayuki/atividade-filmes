/**
 * Módulo de Autenticação no Frontend
 * Gerencia Login, Cadastro, Recuperação de Senha (Mailtrap) e Redefinição com Token (30 min)
 */

import { api } from './api.js';

// Elementos de Layout
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const userNav = document.getElementById('user-nav');
const navUserName = document.getElementById('nav-user-name');
const navUserRole = document.getElementById('nav-user-role');
const btnLogout = document.getElementById('btn-logout');

// Abas e Formulários
const authTabs = document.getElementById('auth-tabs');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const tabForgot = document.getElementById('tab-forgot');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const formForgot = document.getElementById('form-forgot');
const formReset = document.getElementById('form-reset');
const authAlert = document.getElementById('auth-alert');

// Campos Login
const loginEmail = document.getElementById('login-email');
const loginSenha = document.getElementById('login-senha');
const btnSubmitLogin = document.getElementById('btn-submit-login');
const btnToForgot = document.getElementById('btn-to-forgot');

// Campos Cadastro
const registerNome = document.getElementById('register-nome');
const registerEmail = document.getElementById('register-email');
const registerSenha = document.getElementById('register-senha');
const registerRole = document.getElementById('register-role');
const btnSubmitRegister = document.getElementById('btn-submit-register');

// Campos Esqueci Senha
const forgotEmail = document.getElementById('forgot-email');
const btnSubmitForgot = document.getElementById('btn-submit-forgot');
const btnForgotToLogin = document.getElementById('btn-forgot-to-login');

// Campos Redefinir Senha
const resetAccountInfo = document.getElementById('reset-account-info');
const resetSenha = document.getElementById('reset-senha');
const resetSenhaConfirm = document.getElementById('reset-senha-confirm');
const btnSubmitReset = document.getElementById('btn-submit-reset');
const btnResetToLogin = document.getElementById('btn-reset-to-login');

let currentResetToken = null;

export function showAlert(message, type = 'danger') {
  authAlert.textContent = message;
  authAlert.className = `alert alert-${type}`;
  authAlert.classList.remove('hidden');
}

export function hideAlert() {
  authAlert.classList.add('hidden');
  authAlert.textContent = '';
}

export function switchTab(activeTab) {
  hideAlert();

  // Oculta todos os formulários
  formLogin.classList.add('hidden');
  formRegister.classList.add('hidden');
  formForgot.classList.add('hidden');
  formReset.classList.add('hidden');

  // Atualiza classes ativas nas abas
  tabLogin?.classList.remove('active');
  tabRegister?.classList.remove('active');
  tabForgot?.classList.remove('active');

  if (activeTab === 'login') {
    authTabs.classList.remove('hidden');
    tabLogin?.classList.add('active');
    formLogin.classList.remove('hidden');
  } else if (activeTab === 'register') {
    authTabs.classList.remove('hidden');
    tabRegister?.classList.add('active');
    formRegister.classList.remove('hidden');
  } else if (activeTab === 'forgot') {
    authTabs.classList.remove('hidden');
    tabForgot?.classList.add('active');
    formForgot.classList.remove('hidden');
  } else if (activeTab === 'reset') {
    authTabs.classList.add('hidden');
    formReset.classList.remove('hidden');
  }
}

export function showAuthView(initialTab = 'login') {
  authView.classList.remove('hidden');
  appView.classList.add('hidden');
  userNav.classList.add('hidden');
  switchTab(initialTab);
}

export function showAppView(user) {
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  userNav.classList.remove('hidden');
  
  navUserName.textContent = user?.nome || 'Usuário';

  const role = user?.role || 'usuario';
  navUserRole.textContent = role;
  navUserRole.className = `badge-role badge-${role}`;
}

// 1. Handlers de Login
async function handleLogin(e) {
  e.preventDefault();
  hideAlert();

  const email = loginEmail.value.trim();
  const senha = loginSenha.value;

  if (!email || !senha) {
    showAlert('Por favor, preencha o e-mail e a senha.');
    return;
  }

  btnSubmitLogin.disabled = true;
  btnSubmitLogin.textContent = 'Autenticando...';

  try {
    const data = await api.login(email, senha);
    formLogin.reset();
    showAppView(data.user);
    window.dispatchEvent(new CustomEvent('auth:login', { detail: data.user }));
  } catch (err) {
    showAlert(err.message || 'Falha ao autenticar. Verifique suas credenciais.');
  } finally {
    btnSubmitLogin.disabled = false;
    btnSubmitLogin.innerHTML = '<span>Entrar no Catálogo</span>';
  }
}

// 2. Handlers de Cadastro
async function handleRegister(e) {
  e.preventDefault();
  hideAlert();

  const nome = registerNome.value.trim();
  const email = registerEmail.value.trim();
  const senha = registerSenha.value;
  const role = registerRole ? registerRole.value : 'usuario';

  if (!nome || !email || !senha) {
    showAlert('Por favor, preencha todos os campos obrigatórios.');
    return;
  }

  if (senha.length < 4) {
    showAlert('A senha deve conter no mínimo 4 caracteres.');
    return;
  }

  btnSubmitRegister.disabled = true;
  btnSubmitRegister.textContent = 'Cadastrando no Microsserviço...';

  try {
    const data = await api.register(nome, email, senha, role);
    formRegister.reset();
    showAppView(data.user);
    window.dispatchEvent(new CustomEvent('auth:login', { detail: data.user }));
  } catch (err) {
    showAlert(err.message || 'Falha ao criar conta.');
  } finally {
    btnSubmitRegister.disabled = false;
    btnSubmitRegister.innerHTML = '<span>Criar Minha Conta</span>';
  }
}

// 3. Handlers de Esqueci Minha Senha
async function handleForgot(e) {
  e.preventDefault();
  hideAlert();

  const email = forgotEmail.value.trim();
  if (!email) {
    showAlert('Por favor, informe seu e-mail.');
    return;
  }

  btnSubmitForgot.disabled = true;
  btnSubmitForgot.textContent = 'Enviando e-mail via Mailtrap...';

  try {
    const data = await api.forgotPassword(email);
    showAlert(data.message || 'E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada no Mailtrap (link válido por 30 minutos).', 'success');
    formForgot.reset();
  } catch (err) {
    showAlert(err.message || 'Erro ao solicitar recuperação de senha.');
  } finally {
    btnSubmitForgot.disabled = false;
    btnSubmitForgot.innerHTML = '<span>Enviar Link de Recuperação</span>';
  }
}

// 4. Handlers de Redefinir Senha
async function handleReset(e) {
  e.preventDefault();
  hideAlert();

  const novaSenha = resetSenha.value;
  const confirmSenha = resetSenhaConfirm.value;

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

  if (!currentResetToken) {
    showAlert('Token de recuperação não identificado. Solicite um novo link.');
    return;
  }

  btnSubmitReset.disabled = true;
  btnSubmitReset.textContent = 'Atualizando senha no Microsserviço...';

  try {
    const data = await api.resetPassword(currentResetToken, novaSenha);
    showAlert(data.message || 'Senha alterada com sucesso! Você já pode entrar com sua nova senha.', 'success');
    formReset.reset();

    // Limpa token da URL
    history.replaceState(null, '', window.location.pathname);
    currentResetToken = null;

    setTimeout(() => {
      switchTab('login');
    }, 2000);
  } catch (err) {
    showAlert(err.message || 'Falha ao redefinir a senha. O link pode ter expirado (30 min) ou já ter sido usado.');
  } finally {
    btnSubmitReset.disabled = false;
    btnSubmitReset.innerHTML = '<span>Salvar Nova Senha</span>';
  }
}

// 5. Logout
async function handleLogout() {
  await api.logout();
  showAuthView('login');
  window.dispatchEvent(new CustomEvent('auth:logout'));
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 6. Verificação do Token na URL ao carregar
async function checkUrlResetToken() {
  let token = null;

  // Verifica Hash (#reset-token=XYZ)
  const hash = window.location.hash;
  if (hash.includes('reset-token=')) {
    const match = hash.match(/reset-token=([^&]+)/);
    if (match) token = match[1];
  }

  // Verifica Query Params (?token=XYZ ou ?reset_token=XYZ)
  if (!token) {
    const urlParams = new URLSearchParams(window.location.search);
    token = urlParams.get('reset-token') || urlParams.get('token') || urlParams.get('reset_token');
  }

  if (token) {
    currentResetToken = token;
    showAuthView('reset');
    showAlert('Validando link de recuperação junto ao microsserviço...', 'info');
    btnSubmitReset.disabled = true;

    try {
      const result = await api.verifyResetToken(token);
      if (result.valid) {
        resetAccountInfo.innerHTML = `Definindo nova senha para a conta: <strong>${escapeHtml(result.email)}</strong>`;
        showAlert('Link verificado com sucesso! Digite sua nova senha abaixo.', 'success');
        btnSubmitReset.disabled = false;
      } else {
        showAlert(result.error || 'Este link de recuperação é inválido ou expirou após 30 minutos.', 'danger');
        resetAccountInfo.textContent = 'Link inválido ou expirado.';
      }
    } catch (err) {
      showAlert(err.message || 'Este link de recuperação é inválido, expirou após 30 minutos ou já foi utilizado.', 'danger');
      resetAccountInfo.textContent = 'Link inválido ou expirado.';
    }
    return true;
  }
  return false;
}

// Event Listeners
tabLogin?.addEventListener('click', () => switchTab('login'));
tabRegister?.addEventListener('click', () => switchTab('register'));
tabForgot?.addEventListener('click', () => switchTab('forgot'));
btnToForgot?.addEventListener('click', () => switchTab('forgot'));
btnForgotToLogin?.addEventListener('click', () => switchTab('login'));
btnResetToLogin?.addEventListener('click', () => {
  history.replaceState(null, '', window.location.pathname);
  currentResetToken = null;
  switchTab('login');
});

formLogin?.addEventListener('submit', handleLogin);
formRegister?.addEventListener('submit', handleRegister);
formForgot?.addEventListener('submit', handleForgot);
formReset?.addEventListener('submit', handleReset);
btnLogout?.addEventListener('click', handleLogout);

window.addEventListener('hashchange', () => {
  checkUrlResetToken();
});

window.addEventListener('auth:unauthorized', () => {
  showAuthView('login');
});

// Inicialização
export async function initAuth() {
  // Se houver um token de reset na URL, processa o fluxo de redefinição
  const hasResetToken = await checkUrlResetToken();
  if (hasResetToken) {
    return;
  }

  const token = api.getToken();
  const user = api.getUser();

  if (token && user) {
    try {
      const res = await api.me();
      showAppView(res.user);
      window.dispatchEvent(new CustomEvent('auth:login', { detail: res.user }));
    } catch {
      api.clearSession();
      showAuthView('login');
    }
  } else {
    showAuthView('login');
  }
}

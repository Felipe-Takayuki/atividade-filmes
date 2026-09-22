/**
 * Módulo de Integração com a API Backend
 * Gerencia tokens de autenticação e requisições HTTP
 */

const API_BASE = '/api';

export const api = {
  getToken() {
    return localStorage.getItem('token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  },

  getUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  },

  clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      ...(options.headers || {})
    };

    // Define Content-Type JSON apenas se não for FormData e não tiver header customizado
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (
      response.status === 401 &&
      !endpoint.includes('/auth/login') &&
      !endpoint.includes('/auth/register') &&
      !endpoint.includes('/auth/forgot-password') &&
      !endpoint.includes('/auth/reset-password') &&
      !endpoint.includes('/auth/verify-reset-token')
    ) {
      this.clearSession();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.message || `Erro ${response.status}: Falha na requisição`;
      throw new Error(errorMsg);
    }

    return data;
  },

  // ===== AUTH =====
  async register(nome, email, senha) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nome, email, senha })
    });
    if (data.token) {
      this.setToken(data.token);
      this.setUser(data.user);
    }
    return data;
  },

  async login(email, senha) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha })
    });
    if (data.token) {
      this.setToken(data.token);
      this.setUser(data.user);
    }
    return data;
  },

  async me() {
    return this.request('/auth/me');
  },

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Erro ao notificar logout no backend:', e);
    } finally {
      this.clearSession();
    }
  },

  // ===== ESQUECI MINHA SENHA / RESET TOKEN =====
  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async verifyResetToken(token) {
    return this.request(`/auth/verify-reset-token/${encodeURIComponent(token)}`, {
      method: 'GET'
    });
  },

  async resetPassword(token, novaSenha) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token,
        nova_senha: novaSenha
      })
    });
  },

  async getUserRole(userId) {
    return this.request(`/auth/users/${userId}/role`);
  },

  async promoteUser(email) {
    return this.request('/auth/users/promote', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  // ===== MOVIES =====
  async getMovies(forceRefresh = false) {
    const query = forceRefresh ? '?refresh=true' : '';
    return this.request(`/movies${query}`);
  },

  async getMovie(id) {
    return this.request(`/movies/${id}`);
  },

  // ===== FAVORITES =====
  async getFavorites() {
    return this.request('/favorites');
  },

  async addFavorite(movie) {
    return this.request('/favorites', {
      method: 'POST',
      body: JSON.stringify({
        tmdb_movie_id: movie.id,
        titulo: movie.title,
        poster_path: movie.poster_path
      })
    });
  },

  async removeFavorite(tmdbMovieId) {
    return this.request(`/favorites/${tmdbMovieId}`, {
      method: 'DELETE'
    });
  },

  // ===== COMMENTS =====
  async getMovieComments(tmdbMovieId) {
    return this.request(`/movies/${tmdbMovieId}/comments`);
  },

  async addComment(tmdbMovieId, texto) {
    return this.request(`/movies/${tmdbMovieId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ texto })
    });
  },

  async deleteComment(commentId) {
    return this.request(`/comments/${commentId}`, {
      method: 'DELETE'
    });
  },

  // ===== AUDIT LOGS (REDIS STREAMS - ATIVIDADE 5) =====
  async getAuditLogs({ limit = 50, acao = '', usuario_id = '' } = {}) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (acao) params.append('acao', acao);
    if (usuario_id) params.append('usuario_id', usuario_id);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/logs${query}`);
  },

  // ===== PERFIL E UPLOAD DE FOTOS (ATIVIDADE 6 - MINIO OBJECT STORAGE) =====
  async getProfile(userId = null) {
    const endpoint = userId ? `/profile/${userId}` : '/profile';
    return this.request(endpoint);
  },

  async updateProfile(data, targetId = null) {
    const endpoint = targetId ? `/profile/${targetId}` : '/profile';
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async uploadProfilePhoto(file, targetId = null) {
    const formData = new FormData();
    formData.append('foto', file);
    const endpoint = targetId ? `/profile/${targetId}/upload-photo` : '/profile/upload-photo';
    return this.request(endpoint, {
      method: 'POST',
      body: formData
    });
  },

  async deleteProfilePhoto(targetId = null) {
    const endpoint = targetId ? `/profile/${targetId}/photo` : '/profile/photo';
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }
};

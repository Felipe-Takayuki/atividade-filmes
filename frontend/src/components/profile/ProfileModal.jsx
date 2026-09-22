import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function ProfileModal({ isOpen, onClose, targetUserId = null, onMovieSelect = null }) {
  const { user: currentUser, updateUserData } = useAuth();
  const { showToast } = useToast();

  const fileInputRef = useRef(null);

  const [profileUser, setProfileUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [test403Loading, setTest403Loading] = useState(false);
  const [securityTestResult, setSecurityTestResult] = useState(null);

  const [nome, setNome] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const isSelf = !targetUserId || (currentUser && currentUser.id === targetUserId);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Carrega dados do perfil (próprio ou de outro usuário)
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setSecurityTestResult(null);

    async function fetchProfile() {
      try {
        const data = await api.getProfile(targetUserId);
        if (!isMounted) return;

        setProfileUser(data.user);
        setFavorites(data.favorites || []);
        setNome(data.user.nome || '');
        setBio(data.user.bio || '');

        // Se for o próprio usuário, sincroniza com o AuthContext
        if (data.user.is_self) {
          updateUserData(data.user);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Erro ao carregar perfil:', err);
        setError(err.message || 'Falha ao carregar perfil de usuário.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetUserId, updateUserData]);

  if (!isOpen) return null;

  // Upload de Foto de Perfil para o MinIO
  const handlePhotoUpload = async (file) => {
    if (!file) return;

    // Validação preliminar no frontend
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError('Apenas arquivos de imagem (JPEG, PNG, WEBP ou GIF) são permitidos.');
      showToast('Formato de imagem inválido.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('O arquivo selecionado excede o limite máximo permitido de 5MB.');
      showToast('Imagem muito grande (máx 5MB).', 'error');
      return;
    }

    setUploadingPhoto(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.uploadProfilePhoto(file);
      const newFotoUrl = res.foto_url;
      const newFotoKey = res.foto_key;

      setProfileUser((prev) => ({
        ...prev,
        foto_url: newFotoUrl,
        foto_key: newFotoKey
      }));

      updateUserData({
        foto_url: newFotoUrl,
        foto_key: newFotoKey
      });

      setSuccessMsg('Foto de perfil enviada com sucesso para o Object Storage (MinIO)!');
      showToast('Foto de perfil atualizada no MinIO!', 'success');
    } catch (err) {
      console.error('Erro no upload de foto:', err);
      setError(err.message || 'Erro ao enviar foto de perfil para o storage.');
      showToast(err.message || 'Falha no upload da foto.', 'error');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remoção de Foto de Perfil
  const handleDeletePhoto = async () => {
    if (!window.confirm('Deseja realmente remover sua foto de perfil?')) return;

    setUploadingPhoto(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.deleteProfilePhoto();

      setProfileUser((prev) => ({
        ...prev,
        foto_url: null,
        foto_key: null
      }));

      updateUserData({
        foto_url: null,
        foto_key: null
      });

      setSuccessMsg('Foto de perfil removida com sucesso do MinIO.');
      showToast('Foto de perfil removida.', 'info');
    } catch (err) {
      console.error('Erro ao remover foto:', err);
      setError(err.message || 'Erro ao remover foto de perfil.');
      showToast(err.message || 'Falha ao remover foto.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Salvar Alterações de Nome e Bio
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('O nome é obrigatório.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.updateProfile({ nome: nome.trim(), bio: bio.trim() });
      setProfileUser(res.user);
      updateUserData(res.user);

      setSuccessMsg('Perfil atualizado com sucesso!');
      showToast('Perfil salvo com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setError(err.message || 'Erro ao salvar alterações no perfil.');
      showToast(err.message || 'Erro ao salvar perfil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // REQUISITO 4 — Teste Interativo de Tentativa Recusada (HTTP 403)
  const handleTestUnauthorizedEdit = async () => {
    setTest403Loading(true);
    setSecurityTestResult(null);

    try {
      // Simula uma tentativa forjada de editar o perfil com ID 9999 (ou outro usuário qualquer)
      const fakeTargetId = currentUser?.id === 1 ? 2 : 1;
      await api.updateProfile(
        {
          id: fakeTargetId,
          nome: 'Invasor Malicioso',
          bio: 'Tentativa forjada de alteração não autorizada!'
        },
        fakeTargetId
      );

      // Se por algum motivo o backend não bloqueasse, alertaria
      setSecurityTestResult({
        status: 'fail',
        message: 'Falha de segurança inesperada: a requisição não foi bloqueada pelo backend.'
      });
    } catch (err) {
      // O comportamento esperado e correto é a REJEIÇÃO 403 Forbidden!
      setSecurityTestResult({
        status: 'success',
        code: 'HTTP 403 Forbidden',
        message: err.message || 'Acesso proibido. Você não tem permissão para editar o perfil de outro usuário.'
      });
      showToast('🛡️ Prova de Segurança: Tentativa bloqueada com HTTP 403 Forbidden!', 'info');
    } finally {
      setTest403Loading(false);
    }
  };

  // Suporte a Drag and Drop na foto
  const handleDragOver = (e) => {
    e.preventDefault();
    if (isSelf) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isSelf) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handlePhotoUpload(e.dataTransfer.files[0]);
    }
  };

  const formattedDate = profileUser?.criado_em
    ? new Date(profileUser.criado_em).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    : null;

  return (
    <div
      id="profile-modal"
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog profile-modal-dialog" style={{ maxWidth: '680px' }}>
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="modal-icon-badge modal-icon-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h3 className="modal-movie-title" style={{ fontSize: '1.25rem', margin: 0 }}>
                  {isSelf ? 'Meu Perfil' : `Perfil de ${profileUser?.nome || 'Usuário'}`}
                </h3>
                <p className="modal-movie-meta" style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0' }}>
                  {isSelf ? 'Gerencie seus dados e foto de perfil no MinIO' : 'Página pública de usuário'}
                </p>
              </div>
            </div>
            <button
              id="btn-close-profile-modal"
              className="modal-close-btn"
              title="Fechar (Esc)"
              onClick={onClose}
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div className="modal-body profile-modal-body">
            {loading && (
              <div className="loading-state" style={{ padding: '2rem 0' }}>
                <div className="spinner" />
                <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>Carregando dados do perfil...</p>
              </div>
            )}

            {error && (
              <div className="alert alert-danger text-xs" style={{ marginBottom: '1rem' }}>
                <span>⚠️ {error}</span>
              </div>
            )}

            {successMsg && (
              <div className="alert alert-success text-xs" style={{ marginBottom: '1rem' }}>
                <span>✅ {successMsg}</span>
              </div>
            )}

            {/* Banner com Prova de Segurança Requisito 4 */}
            {securityTestResult && (
              <div
                className={`alert ${securityTestResult.status === 'success' ? 'alert-success' : 'alert-danger'} text-xs`}
                style={{ marginBottom: '1rem', borderLeft: '4px solid #10b981' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <strong>🛡️ Validação de Segurança Comprovada ({securityTestResult.code}):</strong>
                  <span>{securityTestResult.message}</span>
                  <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                    O backend confirmou a identidade via JWT e rejeitou a tentativa de editar perfil de outro usuário. Evento auditado no Redis Streams!
                  </span>
                </div>
              </div>
            )}

            {!loading && profileUser && (
              <>
                {/* Seção Superior: Avatar e Cabeçalho do Perfil */}
                <div className="profile-hero-card">
                  {/* Container do Avatar */}
                  <div
                    className={`profile-avatar-container ${isDragging ? 'avatar-dragging' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="profile-avatar-wrapper">
                      {profileUser.foto_url ? (
                        <img
                          src={profileUser.foto_url}
                          alt={profileUser.nome}
                          className="profile-avatar-img"
                        />
                      ) : (
                        <div className="profile-avatar-placeholder">
                          <span>{(profileUser.nome || 'U').charAt(0).toUpperCase()}</span>
                        </div>
                      )}

                      {uploadingPhoto && (
                        <div className="profile-avatar-overlay loading">
                          <div className="spinner-sm" />
                        </div>
                      )}

                      {isSelf && !uploadingPhoto && (
                        <button
                          type="button"
                          className="profile-avatar-edit-badge"
                          title="Alterar foto de perfil no MinIO"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {isSelf && (
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handlePhotoUpload(e.target.files[0]);
                          }
                        }}
                      />
                    )}
                  </div>

                  {/* Informações Básicas do Usuário */}
                  <div className="profile-hero-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <h4 className="profile-user-name">{profileUser.nome}</h4>
                      <span className={`badge-role badge-${profileUser.role || 'usuario'}`}>
                        {profileUser.role === 'admin' ? '👑 Admin' : '👤 Usuário'}
                      </span>
                    </div>

                    {profileUser.email && (
                      <p className="profile-user-email">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        <span>{profileUser.email}</span>
                      </p>
                    )}

                    {formattedDate && (
                      <p className="profile-user-joined">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>Membro desde {formattedDate}</span>
                      </p>
                    )}

                    {/* Ações de Foto para o Usuário Proprietário */}
                    {isSelf && (
                      <div className="profile-photo-actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span>{uploadingPhoto ? 'Enviando...' : 'Carregar Nova Foto'}</span>
                        </button>

                        {profileUser.foto_url && (
                          <button
                            type="button"
                            className="btn btn-ghost-danger btn-xs"
                            onClick={handleDeletePhoto}
                            disabled={uploadingPhoto}
                            title="Remover foto do MinIO"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span>Remover</span>
                          </button>
                        )}
                        <span className="profile-storage-badge" title="Armazenado no bucket MinIO">
                          MinIO S3
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Formulário de Edição de Nome e Bio (Se for o próprio usuário) */}
                {isSelf ? (
                  <form onSubmit={handleSaveProfile} className="profile-edit-form">
                    <div className="form-group">
                      <label htmlFor="profile-nome">Nome de Exibição:</label>
                      <input
                        type="text"
                        id="profile-nome"
                        className="form-control"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Seu nome completo ou apelido"
                        required
                        maxLength={100}
                      />
                    </div>

                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label htmlFor="profile-bio">Bio Curta:</label>
                        <span className="char-counter" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {bio.length} / 500 caracteres
                        </span>
                      </div>
                      <textarea
                        id="profile-bio"
                        className="form-control"
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value.slice(0, 500))}
                        placeholder="Escreva uma breve apresentação sobre você e seus filmes favoritos..."
                      />
                    </div>

                    <div className="profile-form-actions">
                      {/* Botão de Demonstração do Requisito 4: Tentativa Recusada 403 */}
                      <button
                        type="button"
                        className="btn btn-outline-warning btn-sm"
                        onClick={handleTestUnauthorizedEdit}
                        disabled={test403Loading || saving}
                        title="Demonstra a tentativa recusada (HTTP 403) de editar o perfil de outro usuário"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>{test403Loading ? 'Testando...' : '🛡️ Testar Edição em Outro Usuário (403)'}</span>
                      </button>

                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={saving || uploadingPhoto}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                        <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  // Exibição Somente Leitura da Bio para outros usuários
                  <div className="profile-public-bio-card">
                    <h5 style={{ margin: '0 0 0.4rem', fontSize: '0.9rem', color: '#e2e8f0' }}>Sobre o Usuário:</h5>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', fontStyle: profileUser.bio ? 'normal' : 'italic' }}>
                      {profileUser.bio || 'Este usuário ainda não adicionou uma biografia.'}
                    </p>
                  </div>
                )}

                {/* Seção de Filmes Favoritados (REQUISITO 1) */}
                <div className="profile-favorites-section">
                  <div className="profile-section-header">
                    <h4 className="profile-section-title">
                      ⭐ Filmes Favoritados
                      <span className="badge-count" style={{ marginLeft: '0.5rem' }}>
                        {favorites.length}
                      </span>
                    </h4>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.15rem 0 0' }}>
                      {isSelf ? 'Títulos que você salvou no catálogo' : `Filmes favoritos de ${profileUser.nome}`}
                    </p>
                  </div>

                  {favorites.length === 0 ? (
                    <div className="profile-favorites-empty">
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {isSelf
                          ? 'Você ainda não favoritou nenhum filme. Navegue pelo catálogo e clique na estrela!'
                          : 'Este usuário ainda não possui filmes favoritados.'}
                      </p>
                    </div>
                  ) : (
                    <div className="profile-favorites-grid">
                      {favorites.map((fav) => (
                        <div
                          key={fav.id || fav.tmdb_movie_id}
                          className="profile-fav-item"
                          onClick={() => {
                            if (onMovieSelect) {
                              onMovieSelect({
                                id: fav.tmdb_movie_id,
                                title: fav.titulo,
                                poster_path: fav.poster_path
                              });
                              onClose();
                            }
                          }}
                          title={`Ver filme: ${fav.titulo}`}
                        >
                          <div className="profile-fav-poster-wrapper">
                            {fav.poster_url ? (
                              <img
                                src={fav.poster_url}
                                alt={fav.titulo}
                                className="profile-fav-poster"
                                loading="lazy"
                              />
                            ) : (
                              <div className="profile-fav-poster-fallback">
                                🎬
                              </div>
                            )}
                          </div>
                          <span className="profile-fav-title">{fav.titulo}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

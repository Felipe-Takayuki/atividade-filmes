import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  streamAvatar
} from '../controllers/profileController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadPhotoMiddleware } from '../middleware/upload.js';

const router = Router();

// Rota de fallback / proxy de streaming para visualização da foto direto do MinIO
router.get('/avatar/*fotoKey', streamAvatar);

// Consultar perfil (próprio ou de outro usuário)
router.get('/', authenticate, getProfile);
router.get('/:id', authenticate, getProfile);

// Atualizar informações do perfil (nome, bio) - REQUISITO 4: Cada um só edita o próprio!
router.put('/', authenticate, updateProfile);
router.put('/:id', authenticate, updateProfile);

// Upload da foto de perfil para o MinIO - REQUISITO 2 e REQUISITO 4
router.post('/upload-photo', authenticate, uploadPhotoMiddleware, uploadProfilePhoto);
router.post('/:id/upload-photo', authenticate, uploadPhotoMiddleware, uploadProfilePhoto);

// Remover foto de perfil
router.delete('/photo', authenticate, deleteProfilePhoto);
router.delete('/:id/photo', authenticate, deleteProfilePhoto);

export default router;

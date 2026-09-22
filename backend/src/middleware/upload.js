import multer from 'multer';

// Armazenamento em memória (RAM) para enviar o Buffer direto ao MinIO sem salvar no disco local
const storage = multer.memoryStorage();

// Tamanho máximo permitido: 5 Megabytes
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Tipos MIME de imagem permitidos
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];

/**
 * Filtro de validação de tipo de arquivo
 */
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    const error = new Error('Tipo de arquivo inválido. Apenas imagens (JPEG, PNG, WEBP ou GIF) são permitidas.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
});

/**
 * Middleware para tratar upload de foto com captura amigável de erros do Multer
 */
export function uploadPhotoMiddleware(req, res, next) {
  const singleUpload = upload.single('foto');

  singleUpload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'O arquivo excede o limite máximo permitido de 5MB.',
          code: 'FILE_TOO_LARGE'
        });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          error: err.message,
          code: 'INVALID_FILE_TYPE'
        });
      }
      return res.status(400).json({
        error: err.message || 'Erro no upload do arquivo.',
        code: 'UPLOAD_ERROR'
      });
    }

    next();
  });
}

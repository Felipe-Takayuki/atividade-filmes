import assert from 'assert';
import { pool } from './src/config/db.js';
import { updateProfile, uploadProfilePhoto, getProfile, deleteProfilePhoto } from './src/controllers/profileController.js';
import * as minioConfig from './src/config/minio.js';

console.log('🧪 Iniciando Bateria de Testes: Atividade 6 (Upload e Perfil de Usuário)...');

// Mock auxiliar de Response Express
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
    }
  };
  return res;
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  function testCase(name, fn) {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function testCaseAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // ==============================================================================
  // TESTE 1: REQUISITO 4 — Cada um só edita o próprio perfil (Tentativa Recusada 403)
  // ==============================================================================
  await testCaseAsync('REQUISITO 4: Tentativa de editar perfil de OUTRO usuário é bloqueada com HTTP 403', async () => {
    const req = {
      user: { id: 1, email: 'aluno1@exemplo.com', role: 'usuario' },
      params: { id: '2' }, // Tentando editar usuário ID 2
      body: { nome: 'Nome Invasor', bio: 'Bio Invasora' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' }
    };
    const res = createMockRes();

    await updateProfile(req, res);

    assert.strictEqual(res.statusCode, 403, `Esperado 403 Forbidden, recebido ${res.statusCode}`);
    assert.strictEqual(res.body?.code, 'FORBIDDEN_PROFILE_EDIT', 'Código do erro deve ser FORBIDDEN_PROFILE_EDIT');
    assert(res.body?.error.includes('Acesso proibido'), 'Mensagem de erro deve alertar acesso proibido');
    assert.strictEqual(res.body?.solicitante_id, 1);
    assert.strictEqual(res.body?.alvo_id, 2);
  });

  await testCaseAsync('REQUISITO 4: Tentativa de forjar ID de outro usuário no BODY da requisição é bloqueada com HTTP 403', async () => {
    const req = {
      user: { id: 1, email: 'aluno1@exemplo.com', role: 'usuario' },
      params: {}, // Sem param na URL
      body: { id: 99, usuario_id: 99, nome: 'Invasor', bio: 'Bio Maliciosa' }, // Forjando ID 99 no body
      headers: {},
      socket: { remoteAddress: '127.0.0.1' }
    };
    const res = createMockRes();

    await updateProfile(req, res);

    assert.strictEqual(res.statusCode, 403, `Esperado 403 Forbidden, recebido ${res.statusCode}`);
    assert.strictEqual(res.body?.code, 'FORBIDDEN_PROFILE_EDIT');
  });

  // ==============================================================================
  // TESTE 2: REQUISITO 4 — Tentativa de upload em perfil de outro usuário é bloqueada (403)
  // ==============================================================================
  await testCaseAsync('REQUISITO 4: Tentativa de upload de foto no perfil de outro usuário é bloqueada com HTTP 403', async () => {
    const req = {
      user: { id: 1, email: 'aluno1@exemplo.com', role: 'usuario' },
      params: { id: '3' },
      file: { buffer: Buffer.from('fake-image-bytes'), originalname: 'avatar.png', mimetype: 'image/png' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' }
    };
    const res = createMockRes();

    await uploadProfilePhoto(req, res);

    assert.strictEqual(res.statusCode, 403, `Esperado 403 Forbidden, recebido ${res.statusCode}`);
    assert.strictEqual(res.body?.code, 'FORBIDDEN_PHOTO_UPLOAD');
  });

  await testCaseAsync('REQUISITO 4: Tentativa de remoção de foto no perfil de outro usuário é bloqueada com HTTP 403', async () => {
    const req = {
      user: { id: 1, email: 'aluno1@exemplo.com', role: 'usuario' },
      params: { id: '5' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' }
    };
    const res = createMockRes();

    await deleteProfilePhoto(req, res);

    assert.strictEqual(res.statusCode, 403, `Esperado 403 Forbidden, recebido ${res.statusCode}`);
    assert.strictEqual(res.body?.code, 'FORBIDDEN_PHOTO_DELETE');
  });

  // ==============================================================================
  // TESTE 3: Validação de Foto sem Arquivo
  // ==============================================================================
  await testCaseAsync('Validação: Upload sem enviar arquivo retorna HTTP 400', async () => {
    const req = {
      user: { id: 1, email: 'aluno1@exemplo.com', role: 'usuario' },
      params: { id: '1' },
      file: null, // Sem arquivo
      headers: {},
      socket: { remoteAddress: '127.0.0.1' }
    };
    const res = createMockRes();

    await uploadProfilePhoto(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.code, 'NO_FILE_PROVIDED');
  });

  // ==============================================================================
  // TESTE 4: Construção de URL e Decisão de Trade-off (Public vs Presigned)
  // ==============================================================================
  await testCaseAsync('REQUISITO 3: Construção da URL de foto no modo public', async () => {
    const fotoKey = 'avatars/user-1-1725900000.png';
    const url = await minioConfig.buildAvatarUrl(fotoKey);
    assert(url.includes('catalogo-perfil/avatars/user-1-1725900000.png'), 'URL deve conter bucket e key');
  });

  await testCaseAsync('REQUISITO 3: Foto nula retorna URL nula', async () => {
    const url = await minioConfig.buildAvatarUrl(null);
    assert.strictEqual(url, null);
  });

  // ==============================================================================
  // TESTE 5: Consulta de Perfil Próprio e Perfil de Terceiros (Ocultação de e-mail)
  // ==============================================================================
  await testCaseAsync('REQUISITO 1: Consulta de perfil do próprio usuário retorna e-mail e is_self = true', async () => {
    // Busca um usuário real no banco para testar
    const [users] = await pool.query('SELECT id, nome, email FROM usuarios LIMIT 1');
    if (users.length > 0) {
      const u = users[0];
      const req = {
        user: { id: u.id, email: u.email, role: 'usuario' },
        params: { id: String(u.id) },
        headers: {},
        socket: { remoteAddress: '127.0.0.1' }
      };
      const res = createMockRes();

      await getProfile(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.user?.is_self, true);
      assert.strictEqual(res.body?.user?.email, u.email);
      assert(Array.isArray(res.body?.favorites), 'Deve conter array de favoritos');
    }
  });

  await testCaseAsync('REQUISITO 1: Consulta de perfil de OUTRO usuário oculta o e-mail por privacidade', async () => {
    const [users] = await pool.query('SELECT id, nome, email FROM usuarios LIMIT 2');
    if (users.length >= 2) {
      const u1 = users[0];
      const u2 = users[1];
      const req = {
        user: { id: u1.id, email: u1.email, role: 'usuario' },
        params: { id: String(u2.id) }, // Consultando u2
        headers: {},
        socket: { remoteAddress: '127.0.0.1' }
      };
      const res = createMockRes();

      await getProfile(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.user?.is_self, false);
      assert.strictEqual(res.body?.user?.email, undefined, 'E-mail deve ser ocultado para terceiros');
    }
  });

  // ==============================================================================
  // TESTE 6: Atualização Legítima do Próprio Perfil
  // ==============================================================================
  await testCaseAsync('Atualização legítima do próprio perfil funciona com sucesso (HTTP 200)', async () => {
    const [users] = await pool.query('SELECT id, nome, bio FROM usuarios LIMIT 1');
    if (users.length > 0) {
      const u = users[0];
      const req = {
        user: { id: u.id, email: 'teste@exemplo.com', role: 'usuario' },
        params: {},
        body: { nome: u.nome, bio: 'Bio de teste automatizado - Atividade 6' },
        headers: {},
        socket: { remoteAddress: '127.0.0.1' }
      };
      const res = createMockRes();

      await updateProfile(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.user?.bio, 'Bio de teste automatizado - Atividade 6');
    }
  });

  console.log('==============================================');
  console.log(`📊 Resultado dos Testes: ${passed} passaram, ${failed} falharam.`);
  console.log('==============================================');

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Erro fatal nos testes:', err);
  process.exit(1);
});

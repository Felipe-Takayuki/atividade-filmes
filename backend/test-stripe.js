import assert from 'assert';
import Stripe from 'stripe';
import { pool, initDatabase } from './src/config/db.js';
import { handleStripeWebhook, createCheckoutSession } from './src/controllers/stripeController.js';
import { addFavorite, removeFavorite, listFavorites } from './src/controllers/favoriteController.js';

console.log('🧪 Iniciando Bateria de Testes: Atividade 7 (Plano Premium com Stripe)...');

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
    send(data) {
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

  async function testCase(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Inicializa DB
  await initDatabase();

  // Prepara usuário de teste isolado para o teste do Stripe
  const testEmail = `stripe_test_${Date.now()}@exemplo.com`;
  const [insertRes] = await pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash, role, is_premium)
     VALUES (?, ?, 'hash_teste', 'usuario', 0)`,
    ['Usuário Teste Stripe', testEmail]
  );
  const testUserId = insertRes.insertId;

  console.log(`👤 Usuário de teste criado: ID ${testUserId} (${testEmail})`);

  // ==============================================================================
  // TESTE 1: REQUISITO 1 & BANCO — Verificação das colunas do Stripe no MariaDB
  // ==============================================================================
  await testCase('REQUISITO 1: Tabela usuarios possui colunas is_premium, stripe_customer_id, stripe_subscription_id e premium_since', async () => {
    const [cols] = await pool.query('DESCRIBE usuarios');
    const fieldNames = cols.map((c) => c.Field);

    assert(fieldNames.includes('is_premium'), 'Coluna is_premium deve existir');
    assert(fieldNames.includes('stripe_customer_id'), 'Coluna stripe_customer_id deve existir');
    assert(fieldNames.includes('stripe_subscription_id'), 'Coluna stripe_subscription_id deve existir');
    assert(fieldNames.includes('premium_since'), 'Coluna premium_since deve existir');
  });

  // ==============================================================================
  // TESTE 2: REQUISITO 5 — Conformidade PCI-DSS: NUNCA guardar dados de cartão no banco
  // ==============================================================================
  await testCase('REQUISITO 5: Garantia PCI-DSS — Nenhuma coluna de cartão (cartao, cvv, pan, numero_cartao) existe no banco', async () => {
    const [cols] = await pool.query('DESCRIBE usuarios');
    const sensitiveWords = ['cartao', 'card', 'cvv', 'cvc', 'validade', 'pan', 'numero_cartao'];
    for (const c of cols) {
      const lower = c.Field.toLowerCase();
      for (const w of sensitiveWords) {
        assert(!lower.includes(w), `Coluna sensível proibida detectada no banco de dados: ${c.Field}`);
      }
    }
  });

  // ==============================================================================
  // TESTE 3: REQUISITO 4 — Limite de 5 favoritos para usuários não-premium
  // ==============================================================================
  await testCase('REQUISITO 4: Usuário comum (não-premium) tem limite de 5 favoritos; ao tentar o 6º recebe HTTP 403', async () => {
    // Limpa favoritos prévios do usuário
    await pool.query('DELETE FROM favoritos WHERE usuario_id = ?', [testUserId]);

    const reqUser = { id: testUserId, email: testEmail, role: 'usuario' };

    // Adiciona 5 favoritos (filmes 101 a 105)
    for (let i = 1; i <= 5; i++) {
      const req = {
        user: reqUser,
        body: { tmdb_movie_id: 100 + i, titulo: `Filme Teste ${i}`, poster_path: `/p${i}.jpg` },
        headers: {},
        ip: '127.0.0.1'
      };
      const res = createMockRes();
      await addFavorite(req, res);
      assert.strictEqual(res.statusCode, 201, `Favorito ${i} deveria ser adicionado com 201`);
    }

    // Tenta adicionar o 6º favorito -> DEVE SER REJEITADO COM 403
    const req6 = {
      user: reqUser,
      body: { tmdb_movie_id: 106, titulo: 'Filme Teste 6 Excedente', poster_path: '/p6.jpg' },
      headers: {},
      ip: '127.0.0.1'
    };
    const res6 = createMockRes();
    await addFavorite(req6, res6);

    assert.strictEqual(res6.statusCode, 403, '6º favorito deve ser bloqueado com HTTP 403');
    assert.strictEqual(res6.body.code, 'PREMIUM_REQUIRED', 'Deve retornar code PREMIUM_REQUIRED');
    assert.strictEqual(res6.body.limit, 5, 'Deve informar que o limite é 5');
  });

  // ==============================================================================
  // TESTE 4: REQUISITO 3 — Validação de assinatura do Webhook do Stripe
  // ==============================================================================
  const mockWebhookSecret = 'whsec_test_secret_for_local_validation_1234567890';
  process.env.STRIPE_WEBHOOK_SECRET = mockWebhookSecret;

  await testCase('REQUISITO 3: Webhook rejeita chamada sem cabeçalho "stripe-signature" com HTTP 400', async () => {
    const req = {
      headers: {},
      body: Buffer.from(JSON.stringify({ type: 'test' }))
    };
    const res = createMockRes();
    await handleStripeWebhook(req, res);

    assert.strictEqual(res.statusCode, 400, 'Requisição sem assinatura deve retornar 400');
  });

  await testCase('REQUISITO 3: Webhook rejeita requisição com assinatura falsa/corrompida com HTTP 400', async () => {
    const req = {
      headers: { 'stripe-signature': 't=123456,v1=assinatura_falsificada_invalida' },
      body: Buffer.from(JSON.stringify({ type: 'test' }))
    };
    const res = createMockRes();
    await handleStripeWebhook(req, res);

    assert.strictEqual(res.statusCode, 400, 'Assinatura inválida deve retornar 400 Webhook Error');
  });

  // ==============================================================================
  // TESTE 5: REQUISITO 3 — Webhook com assinatura criptográfica válida atualiza banco
  // ==============================================================================
  await testCase('REQUISITO 3: Webhook assinado autenticamente (checkout.session.completed) marca usuário como premium: true no banco', async () => {
    const fakeSessionId = `cs_test_${Date.now()}`;
    const fakeCustomerId = `cus_test_${Date.now()}`;
    const fakeSubscriptionId = `sub_test_${Date.now()}`;

    const payloadObj = {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      api_version: '2024-06-20',
      created: Math.floor(Date.now() / 1000),
      type: 'checkout.session.completed',
      data: {
        object: {
          id: fakeSessionId,
          object: 'checkout.session',
          client_reference_id: String(testUserId),
          customer: fakeCustomerId,
          subscription: fakeSubscriptionId,
          amount_total: 990,
          currency: 'brl',
          customer_details: {
            email: testEmail
          },
          metadata: {
            usuario_id: String(testUserId),
            usuario_email: testEmail
          }
        }
      }
    };

    const payloadString = JSON.stringify(payloadObj);
    const rawPayloadBuffer = Buffer.from(payloadString, 'utf8');

    // Gera assinatura válida HMAC SHA-256 usando utilitário nativo do Stripe
    const stripeInstance = new Stripe('sk_test_fake_key_for_testing', { apiVersion: '2024-06-20' });
    const validSignature = stripeInstance.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret: mockWebhookSecret
    });

    const req = {
      headers: { 'stripe-signature': validSignature },
      body: rawPayloadBuffer,
      ip: '127.0.0.1'
    };
    const res = createMockRes();

    await handleStripeWebhook(req, res);

    assert.strictEqual(res.statusCode, 200, 'Webhook assinado com sucesso deve retornar 200 OK');
    assert.strictEqual(res.body.received, true, 'Resposta deve confirmar { received: true }');

    // Consulta o banco MariaDB para verificar se o usuário virou premium
    const [userRows] = await pool.query(
      'SELECT id, is_premium, stripe_customer_id, stripe_subscription_id, premium_since FROM usuarios WHERE id = ?',
      [testUserId]
    );

    const user = userRows[0];
    assert.strictEqual(user.is_premium, 1, 'is_premium deve ser 1 após webhook');
    assert.strictEqual(user.stripe_customer_id, fakeCustomerId, 'stripe_customer_id deve estar registrado');
    assert.strictEqual(user.stripe_subscription_id, fakeSubscriptionId, 'stripe_subscription_id deve estar registrado');
    assert(user.premium_since !== null, 'premium_since deve estar preenchido');
  });

  // ==============================================================================
  // TESTE 6: REQUISITO 4 — Benefício Premium: Agora o usuário adiciona mais de 5 favoritos!
  // ==============================================================================
  await testCase('REQUISITO 4: Usuário agora Premium adiciona 6º e 7º filme favorito sem nenhum bloqueio (Ilimitado)', async () => {
    const reqUser = { id: testUserId, email: testEmail, role: 'usuario' };

    // Adiciona o 6º favorito
    const req6 = {
      user: reqUser,
      body: { tmdb_movie_id: 106, titulo: 'Filme Teste 6 (Desbloqueado)', poster_path: '/p6.jpg' },
      headers: {},
      ip: '127.0.0.1'
    };
    const res6 = createMockRes();
    await addFavorite(req6, res6);
    assert.strictEqual(res6.statusCode, 201, 'Usuário Premium deve conseguir adicionar 6º favorito com 201');

    // Adiciona o 7º favorito
    const req7 = {
      user: reqUser,
      body: { tmdb_movie_id: 107, titulo: 'Filme Teste 7 (Ilimitado)', poster_path: '/p7.jpg' },
      headers: {},
      ip: '127.0.0.1'
    };
    const res7 = createMockRes();
    await addFavorite(req7, res7);
    assert.strictEqual(res7.statusCode, 201, 'Usuário Premium deve conseguir adicionar 7º favorito com 201');

    // Lista favoritos e confere total
    const reqList = { user: reqUser };
    const resList = createMockRes();
    await listFavorites(reqList, resList);
    assert.strictEqual(resList.body.total, 7, 'Total de favoritos deve ser 7');
    assert.strictEqual(resList.body.is_premium, true, 'is_premium deve ser true na listagem');
    assert.strictEqual(resList.body.limit, null, 'limit deve ser null para usuário premium');
  });

  // ==============================================================================
  // TESTE 7: REQUISITO 2 — Usuário já premium é impedido de iniciar nova sessão de checkout
  // ==============================================================================
  await testCase('REQUISITO 2: Usuário já Premium é avisado caso tente assinar novamente', async () => {
    const req = {
      user: { id: testUserId, email: testEmail, nome: 'Usuário Teste' },
      method: 'POST',
      headers: {},
      ip: '127.0.0.1'
    };
    const res = createMockRes();
    await createCheckoutSession(req, res);

    assert.strictEqual(res.statusCode, 400, 'Deve retornar 400 avisando que já é premium');
    assert.strictEqual(res.body.is_premium, true);
  });

  // ==============================================================================
  // TESTE 8: REQUISITO 3 — Cancelamento de assinatura via webhook (customer.subscription.deleted)
  // ==============================================================================
  await testCase('REQUISITO 3: Webhook de cancelamento (customer.subscription.deleted) remove status premium do usuário', async () => {
    const [userRows] = await pool.query(
      'SELECT stripe_subscription_id FROM usuarios WHERE id = ?',
      [testUserId]
    );
    const subId = userRows[0].stripe_subscription_id;

    const payloadObj = {
      id: `evt_cancel_${Date.now()}`,
      object: 'event',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: subId
        }
      }
    };

    const payloadString = JSON.stringify(payloadObj);
    const stripeInstance = new Stripe('sk_test_fake_key_for_testing', { apiVersion: '2024-06-20' });
    const validSignature = stripeInstance.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret: mockWebhookSecret
    });

    const req = {
      headers: { 'stripe-signature': validSignature },
      body: Buffer.from(payloadString, 'utf8'),
      ip: '127.0.0.1'
    };
    const res = createMockRes();

    await handleStripeWebhook(req, res);
    assert.strictEqual(res.statusCode, 200);

    const [updatedRows] = await pool.query(
      'SELECT is_premium FROM usuarios WHERE id = ?',
      [testUserId]
    );
    assert.strictEqual(updatedRows[0].is_premium, 0, 'Usuário deve voltar para is_premium = 0');
  });

  // Limpeza final do usuário de teste
  await pool.query('DELETE FROM favoritos WHERE usuario_id = ?', [testUserId]);
  await pool.query('DELETE FROM usuarios WHERE id = ?', [testUserId]);

  console.log('\n==============================================');
  console.log(`🎉 Fim dos Testes: ${passed} passaram, ${failed} falharam.`);
  console.log('==============================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Erro fatal ao rodar testes:', err);
  process.exit(1);
});

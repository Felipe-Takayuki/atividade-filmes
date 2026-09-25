import Stripe from 'stripe';
import { pool } from '../config/db.js';
import {
  getStripeClient,
  getStripeSecretKey,
  getStripePublishableKey,
  getStripeWebhookSecret,
  getStripePriceId,
  getAppUrl,
  PLAN_DETAILS,
  isStripeConfigured
} from '../config/stripe.js';
import { sendLogEvent, getClientIp } from '../services/logClient.js';

/**
 * Cria uma Sessão de Checkout do Stripe (Modo de Teste) para o Plano Premium.
 * Redireciona o usuário para o Checkout seguro hospedado pelo Stripe.
 * Rota: POST /api/stripe/create-checkout-session ou GET /api/stripe/checkout
 */
export async function createCheckoutSession(req, res) {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const userName = req.user?.nome || 'Usuário';

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    // 1. Verifica no banco se o usuário já possui plano premium
    const [rows] = await pool.query(
      'SELECT id, nome, email, is_premium, stripe_customer_id, stripe_subscription_id FROM usuarios WHERE id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const user = rows[0];

    if (user.is_premium) {
      return res.status(400).json({
        error: 'Você já possui uma assinatura Premium ativa no Catálogo Tom Hanks!',
        is_premium: true
      });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({
        error: 'O serviço de pagamento Stripe não está configurado. Por favor, defina STRIPE_SECRET_KEY no arquivo .env.',
        code: 'STRIPE_NOT_CONFIGURED'
      });
    }

    const priceId = getStripePriceId();
    const appUrl = getAppUrl();

    // 2. Configura os itens do checkout (Price ID configurado ou Price Data dinâmico de teste)
    const lineItem = priceId
      ? {
          price: priceId,
          quantity: 1
        }
      : {
          price_data: {
            currency: PLAN_DETAILS.currency,
            product_data: {
              name: PLAN_DETAILS.name,
              description: PLAN_DETAILS.description
            },
            unit_amount: PLAN_DETAILS.priceCents,
            recurring: {
              interval: PLAN_DETAILS.interval
            }
          },
          quantity: 1
        };

    // 3. Monta a sessão do Stripe Checkout
    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [lineItem],
      customer_email: userEmail,
      client_reference_id: String(userId),
      metadata: {
        usuario_id: String(userId),
        usuario_email: userEmail,
        usuario_nome: userName,
        plano: 'premium'
      },
      subscription_data: {
        metadata: {
          usuario_id: String(userId),
          usuario_email: userEmail
        }
      },
      success_url: `${appUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?payment=cancelled`
    };

    // Se o usuário já tiver um customer ID associado, reutiliza
    if (user.stripe_customer_id) {
      sessionConfig.customer = user.stripe_customer_id;
      delete sessionConfig.customer_email;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Registra evento de auditoria: início de checkout
    sendLogEvent({
      usuario_id: userId,
      usuario_email: userEmail,
      acao: 'iniciar_checkout_stripe',
      ip: getClientIp(req),
      detalhes: {
        session_id: session.id,
        valor_centavos: PLAN_DETAILS.priceCents,
        moeda: PLAN_DETAILS.currency
      }
    });

    console.log(`[Stripe] Checkout Session criada com sucesso (${session.id}) para usuário ${userEmail} (ID: ${userId})`);

    // Suporta tanto chamada programática via JSON quanto navegação direta no navegador
    if (req.method === 'GET' && req.accepts('html') && !req.xhr) {
      return res.redirect(303, session.url);
    }

    return res.json({
      success: true,
      url: session.url,
      session_id: session.id
    });
  } catch (err) {
    console.error('[Stripe] Erro ao criar Checkout Session:', err);
    return res.status(500).json({
      error: 'Erro ao gerar sessão de pagamento no Stripe.',
      message: err.message
    });
  }
}

/**
 * Webhook Oficial do Stripe
 * Recebe notificações assíncronas do Stripe quando o pagamento é concluído.
 * Valida obrigatoriamente a assinatura criptográfica (stripe-signature) com STRIPE_WEBHOOK_SECRET.
 * Rota: POST /api/stripe/webhook
 */
export async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.warn('[Stripe Webhook] ⚠️ Requisição rejeitada: cabeçalho "stripe-signature" ausente.');
    return res.status(400).json({
      error: 'Cabeçalho stripe-signature ausente. Esta rota aceita apenas notificações legítimas assinadas pelo Stripe.'
    });
  }

  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    console.error('[Stripe Webhook] ❌ STRIPE_WEBHOOK_SECRET não configurado no .env.');
    return res.status(500).json({
      error: 'Segredo do webhook do Stripe não configurado no backend.'
    });
  }

  let event;
  try {
    const stripe = getStripeClient() || new Stripe('sk_test_dummy_for_webhook', { apiVersion: '2024-06-20' });
    // req.body DEVE ser o Buffer bruto (raw Body) para cálculo preciso do HMAC SHA-256
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`[Stripe Webhook] ❌ Assinatura do webhook inválida: ${err.message}`);
    return res.status(400).send(`Webhook Error: Assinatura inválida (${err.message})`);
  }

  console.log(`[Stripe Webhook] 📩 Evento recebido e verificado: ${event.type} [${event.id}]`);

  try {
    switch (event.type) {
      // 1. Pagamento de checkout confirmado com sucesso
      case 'checkout.session.completed': {
        const session = event.data.object;
        const usuarioIdStr = session.client_reference_id || session.metadata?.usuario_id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (!usuarioIdStr) {
          console.warn('[Stripe Webhook] checkout.session.completed recebido sem client_reference_id/usuario_id.');
          break;
        }

        const usuarioId = parseInt(usuarioIdStr, 10);

        // Atualiza o usuário no MariaDB para is_premium = 1 e armazena os IDs do Stripe
        // NUNCA guardamos dados de cartão (número, CVV, validade) — apenas IDs de referência!
        await pool.query(
          `UPDATE usuarios
           SET is_premium = 1,
               stripe_customer_id = COALESCE(?, stripe_customer_id),
               stripe_subscription_id = COALESCE(?, stripe_subscription_id),
               premium_since = NOW()
           WHERE id = ?`,
          [customerId || null, subscriptionId || null, usuarioId]
        );

        console.log(`[Stripe Webhook] 👑 Usuário ID ${usuarioId} atualizado para PREMIUM com sucesso!`);

        // Registra evento de auditoria no log-service
        sendLogEvent({
          usuario_id: usuarioId,
          usuario_email: session.customer_details?.email || session.metadata?.usuario_email || 'desconhecido',
          acao: 'upgrade_premium',
          ip: getClientIp(req),
          detalhes: {
            evento: event.type,
            stripe_session_id: session.id,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            valor_total: session.amount_total,
            moeda: session.currency
          }
        });

        break;
      }

      // 2. Fatura de assinatura paga recorrente
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        const customerId = invoice.customer;

        if (subscriptionId) {
          await pool.query(
            `UPDATE usuarios
             SET is_premium = 1
             WHERE stripe_subscription_id = ? OR stripe_customer_id = ?`,
            [subscriptionId, customerId]
          );
          console.log(`[Stripe Webhook] 💳 Pagamento recorrente aprovado para assinatura ${subscriptionId}.`);
        }
        break;
      }

      // 3. Assinatura cancelada
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        await pool.query(
          `UPDATE usuarios
           SET is_premium = 0
           WHERE stripe_subscription_id = ?`,
          [subscriptionId]
        );

        console.log(`[Stripe Webhook] ❌ Assinatura ${subscriptionId} encerrada. Usuário retornado ao plano gratuito.`);

        sendLogEvent({
          usuario_id: 0,
          usuario_email: 'stripe-webhook',
          acao: 'cancelamento_premium',
          ip: getClientIp(req),
          detalhes: {
            stripe_subscription_id: subscriptionId
          }
        });

        break;
      }

      default:
        console.log(`[Stripe Webhook] Evento não tratado: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook] Erro ao processar evento:', err);
    return res.status(500).json({ error: 'Erro interno ao processar webhook do Stripe.' });
  }
}

/**
 * Consulta status da assinatura Premium do usuário autenticado.
 * Rota: GET /api/stripe/status
 */
export async function getSubscriptionStatus(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    const [rows] = await pool.query(
      `SELECT id, nome, email, is_premium, stripe_customer_id, stripe_subscription_id, premium_since,
              (SELECT COUNT(*) FROM favoritos WHERE usuario_id = usuarios.id) as total_favoritos
       FROM usuarios
       WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const user = rows[0];
    const isPremium = Boolean(user.is_premium);

    return res.json({
      success: true,
      is_premium: isPremium,
      premium_since: user.premium_since,
      stripe_configured: isStripeConfigured(),
      total_favoritos: user.total_favoritos,
      limite_favoritos: isPremium ? null : PLAN_DETAILS.maxFreeFavorites,
      beneficios: isPremium
        ? ['Favoritos ilimitados', 'Selo VIP no Perfil e Comentários', 'Prioridade no Catálogo']
        : [`Máximo de ${PLAN_DETAILS.maxFreeFavorites} filmes favoritos`, 'Acesso padrão ao catálogo'],
      plano: {
        nome: PLAN_DETAILS.name,
        preco: 'R$ 9,90/mês',
        moeda: PLAN_DETAILS.currency
      }
    });
  } catch (err) {
    console.error('[Stripe] Erro ao consultar status da assinatura:', err);
    return res.status(500).json({ error: 'Erro ao consultar status da assinatura.' });
  }
}

/**
 * Retorna configurações públicas do Stripe para o Frontend.
 * Rota: GET /api/stripe/config
 */
export function getPublicConfig(req, res) {
  return res.json({
    publishable_key: getStripePublishableKey(),
    stripe_configured: isStripeConfigured(),
    plan: {
      name: PLAN_DETAILS.name,
      description: PLAN_DETAILS.description,
      price: 'R$ 9,90/mês',
      priceCents: PLAN_DETAILS.priceCents,
      maxFreeFavorites: PLAN_DETAILS.maxFreeFavorites
    }
  });
}

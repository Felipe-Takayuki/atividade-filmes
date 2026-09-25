import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

export function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || '';
}

export function getStripePublishableKey() {
  return process.env.STRIPE_PUBLISHABLE_KEY || '';
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || '';
}

export function getStripePriceId() {
  return process.env.STRIPE_PRICE_ID || '';
}

export function getAppUrl() {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

/**
 * Detalhes do Plano Premium
 */
export const PLAN_DETAILS = {
  name: 'Plano Premium - Catálogo Tom Hanks',
  description: 'Assinatura com favoritos ilimitados e selo VIP exclusivo no catálogo Tom Hanks.',
  priceCents: 990, // R$ 9,90
  currency: 'brl',
  interval: 'month',
  maxFreeFavorites: 5
};

/**
 * Retorna uma instância do Stripe oficial configurada com a chave atual
 */
export function getStripeClient() {
  const secretKey = getStripeSecretKey();
  if (secretKey) {
    return new Stripe(secretKey, {
      apiVersion: '2024-06-20'
    });
  }
  return null;
}

export function isStripeConfigured() {
  return Boolean(getStripeSecretKey());
}

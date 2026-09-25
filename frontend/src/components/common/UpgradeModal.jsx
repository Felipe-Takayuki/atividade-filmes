import React, { useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function UpgradeModal({ isOpen, onClose, triggerReason = null }) {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const isAlreadyPremium = Boolean(user?.is_premium);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.createCheckoutSession();
      if (data?.url) {
        showToast('Redirecionando para o checkout seguro do Stripe...', 'info');
        window.location.href = data.url;
      } else {
        throw new Error('URL da sessão de checkout não foi retornada pelo servidor.');
      }
    } catch (err) {
      console.error('[Stripe Upgrade] Erro ao iniciar checkout:', err);
      const msg = err.data?.error || err.message || 'Falha ao conectar com o serviço de pagamento Stripe.';
      setError(msg);
      showToast(msg, 'error');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content upgrade-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '92%' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.5rem' }}>👑</span>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                Plano Premium
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Catálogo de Filmes Tom Hanks
              </span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Fechar modal">
            &times;
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
          {triggerReason && (
            <div className="alert alert-info text-xs" style={{ marginBottom: '1.2rem', borderLeft: '4px solid #f59e0b' }}>
              <span>⚠️ {triggerReason}</span>
            </div>
          )}

          {error && (
            <div className="alert alert-danger text-xs" style={{ marginBottom: '1.2rem' }}>
              <span>❌ {error}</span>
            </div>
          )}

          {isAlreadyPremium ? (
            <div className="premium-active-box" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⭐</div>
              <h4 style={{ color: '#fbbf24', margin: '0 0 0.5rem 0' }}>Você já é Membro Premium!</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Sua conta já possui acesso total a favoritos ilimitados e todos os recursos exclusivos.
              </p>
              <button className="btn btn-outline btn-block" onClick={onClose}>
                Fechar
              </button>
            </div>
          ) : (
            <>
              {/* Card de Preço em Destaque */}
              <div
                className="pricing-highlight-card"
                style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.05))',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#f59e0b', fontWeight: '700', letterSpacing: '0.05em' }}>
                    Assinatura Mensal
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f8fafc' }}>R$ 9,90</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>/ mês</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '700'
                    }}
                  >
                    Modo Teste Seguro
                  </span>
                </div>
              </div>

              {/* Lista de Benefícios */}
              <h5 style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                O que você ganha no Premium:
              </h5>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: '#e2e8f0' }}>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                  <strong>Favoritos Ilimitados:</strong> guarde quantos filmes quiser (plano comum limitado a 5).
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: '#e2e8f0' }}>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                  <strong>Selo VIP Exclusivo:</strong> badge dourado no seu perfil, navbar e comentários.
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: '#e2e8f0' }}>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                  <strong>Segurança PCI-DSS:</strong> dados de cartão nunca tocam nosso banco (processados pelo Stripe).
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: '#e2e8f0' }}>
                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                  <strong>Ativação Instantânea:</strong> confirmação automática via Webhook assinado.
                </li>
              </ul>

              {/* Botão de Ação Principal */}
              <button
                type="button"
                className="btn btn-warning btn-block"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '700',
                  padding: '0.85rem',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <span className="spinner-sm" />
                    Abrindo Stripe Checkout...
                  </span>
                ) : (
                  <span>💳 Assinar por R$ 9,90/mês no Stripe</span>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.85rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  🔒 Processamento em modo de teste do Stripe. Nenhum valor real será cobrado.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

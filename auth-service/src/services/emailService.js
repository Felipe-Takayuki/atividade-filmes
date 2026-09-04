import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Carrega .env do diretório atual ou do diretório raiz do projeto se executado a partir de subpastas
dotenv.config();
if (!process.env.SMTP_PASS && !process.env.BREVO_API_KEY) {
  const parentEnv = path.resolve(process.cwd(), '../.env');
  if (fs.existsSync(parentEnv)) {
    dotenv.config({ path: parentEnv });
  }
}

/**
 * Utilitário para extrair nome e e-mail de strings no formato "Nome <email@dominio.com>", "email@dominio.com"
 * ou strings envolvidas por aspas duplas/simples comuns em arquivos .env e docker-compose.
 */
export function parseFromAddress(fromStr) {
  if (!fromStr) {
    return { name: 'Catálogo Filmes', email: 'noreply@catalogofilmes.com' };
  }
  // Remove aspas externas que podem vir de arquivos .env ou docker-compose
  const clean = fromStr.trim().replace(/^["'\s]+|["'\s]+$/g, '');
  const match = clean.match(/^(?:(?:"?([^"]*)"?\s*)?<([^>]+)>|([^<]+))$/);
  if (match) {
    if (match[2]) {
      const name = (match[1] || 'Catálogo Filmes').trim().replace(/^["']|["']$/g, '');
      const email = match[2].trim();
      return { name: name || 'Catálogo Filmes', email };
    }
    const val = (match[3] || '').trim();
    return { name: 'Catálogo Filmes', email: val };
  }
  return { name: 'Catálogo Filmes', email: clean };
}

/**
 * Obtém a lista de remetentes verificados da conta Brevo via REST API.
 * @param {string} apiKey
 * @returns {Promise<Array<{id: number, email: string, name: string, active: boolean}>>}
 */
export async function getBrevoVerifiedSenders(apiKey) {
  if (!apiKey) return [];
  try {
    const response = await fetch('https://api.brevo.com/v3/senders', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey
      }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.senders || [];
  } catch (err) {
    return [];
  }
}

/**
 * Resolve o remetente válido para a Brevo.
 * Na Brevo, o remetente DEVE ser obrigatoriamente um e-mail verificado no painel da conta.
 */
export function getResolvedFromAddress(verifiedSenders = []) {
  // 1. Prioridade Máxima: BREVO_SENDER_EMAIL explicitamente configurado
  if (process.env.BREVO_SENDER_EMAIL) {
    const customSender = process.env.BREVO_SENDER_EMAIL.trim().replace(/^["']|["']$/g, '');
    if (customSender) {
      return customSender.includes('<') ? customSender : `Catálogo Filmes <${customSender}>`;
    }
  }

  // 2. Se SMTP_FROM foi configurado com e-mail real personalizado (sem domínios fictícios de exemplo)
  if (process.env.SMTP_FROM) {
    const from = process.env.SMTP_FROM.trim().replace(/^["']|["']$/g, '');
    if (
      !from.includes('@catalogofilmes') &&
      !from.includes('.local') &&
      !from.includes('@exemplo.com') &&
      !from.includes('@dominio.com') &&
      !from.includes('seu_email')
    ) {
      return from;
    }
  }

  // 3. Se SMTP_USER for o e-mail cadastrado na Brevo, usa-o automaticamente (já é verificado na Brevo)
  const userEmail = (process.env.SMTP_USER && process.env.SMTP_USER.includes('@') && !process.env.SMTP_USER.endsWith('@smtp-brevo.com'))
    ? process.env.SMTP_USER.trim().replace(/^["']|["']$/g, '')
    : null;

  if (userEmail) {
    return `Catálogo Filmes <${userEmail}>`;
  }

  // 4. Se houver remetentes verificados ativos obtidos da conta Brevo
  if (Array.isArray(verifiedSenders) && verifiedSenders.length > 0) {
    const active = verifiedSenders.find(s => s.active) || verifiedSenders[0];
    if (active?.email) {
      return `${active.name || 'Catálogo Filmes'} <${active.email}>`;
    }
  }

  return process.env.SMTP_FROM
    ? process.env.SMTP_FROM.trim().replace(/^["']|["']$/g, '')
    : 'Catálogo Filmes <noreply@catalogofilmes.com>';
}

/**
 * Cria e configura o transporte SMTP via Brevo (smtp-relay.brevo.com).
 */
export function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  const isSecure = port === 465;

  const transportConfig = {
    host,
    port,
    secure: isSecure,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false
    }
  };

  return nodemailer.createTransport(transportConfig);
}

/**
 * Envia e-mail diretamente via API REST da Brevo (HTTPS porta 443).
 * Ideal para chaves de API (xkeysib-...) ou quando portas SMTP estão bloqueadas.
 */
export async function sendViaBrevoApi({ toEmail, userName, resetLink, htmlContent, textContent, apiKey, fromAddress }) {
  let sender = parseFromAddress(fromAddress);

  // Se o remetente ainda for fictício/exemplo, tenta auto-descobrir remetente verificado na Brevo
  if (
    sender.email.includes('catalogofilmes') ||
    sender.email.includes('exemplo.com') ||
    sender.email.includes('dominio.com') ||
    sender.email.includes('seu_email')
  ) {
    const verifiedSenders = await getBrevoVerifiedSenders(apiKey);
    const active = verifiedSenders.find(s => s.active) || verifiedSenders[0];
    if (active?.email) {
      console.log(`[Auth-Email] Remetente padrão substituído por remetente verificado da Brevo: ${active.email}`);
      sender = { name: active.name || sender.name, email: active.email };
    }
  }

  const endpoint = 'https://api.brevo.com/v3/smtp/email';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: {
        name: sender.name,
        email: sender.email
      },
      to: [
        {
          email: toEmail,
          name: userName || toEmail
        }
      ],
      subject: '🔑 Recuperação de Senha — Catálogo de Filmes Tom Hanks',
      htmlContent,
      textContent
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || `Status HTTP ${response.status}`;
    if (response.status === 400 && errorMsg.toLowerCase().includes('sender')) {
      console.error(`[Auth-Email] [Erro Brevo] O remetente "${sender.email}" não está verificado na sua conta Brevo.`);
      console.error('[Auth-Email] Acesse Brevo > Senders & IPs > Senders e adicione seu e-mail como remetente autorizado.');
      const senders = await getBrevoVerifiedSenders(apiKey);
      if (senders.length > 0) {
        console.error(`[Auth-Email] Remetentes autorizados encontrados na sua conta: ${senders.map(s => s.email).join(', ')}`);
      }
    }
    throw new Error(`Erro na API Brevo: ${errorMsg}`);
  }

  console.log(`[Auth-Email] E-mail de recuperação enviado com sucesso via Brevo API para ${toEmail}. MessageId: ${data.messageId}`);
  return {
    success: true,
    messageId: data.messageId,
    resetLink,
    provider: 'Brevo (REST API)'
  };
}

/**
 * Envia e-mail via API REST da Resend (HTTPS porta 443).
 * Ideal para chaves de API da Resend (iniciadas em re_...).
 */
export async function sendViaResendApi({ toEmail, userName, resetLink, htmlContent, textContent, apiKey, fromAddress }) {
  const endpoint = 'https://api.resend.com/emails';

  // No plano gratuito da Resend sem domínio próprio, o remetente padrão é onboarding@resend.dev
  let sender = fromAddress;
  if (!fromAddress || fromAddress.includes('@catalogofilmes') || fromAddress.includes('brevo.com') || fromAddress.includes('@exemplo')) {
    sender = 'Catálogo Filmes <onboarding@resend.dev>';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: sender,
      to: [toEmail],
      subject: '🔑 Recuperação de Senha — Catálogo de Filmes Tom Hanks',
      html: htmlContent,
      text: textContent
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || `Status HTTP ${response.status}`;
    console.error(`[Auth-Email] [Erro Resend] Falha na API da Resend: ${errorMsg}`);
    throw new Error(`Erro na API Resend: ${errorMsg}`);
  }

  console.log(`[Auth-Email] E-mail de recuperação enviado com sucesso via Resend para ${toEmail}. ID: ${data.id}`);
  return {
    success: true,
    messageId: data.id,
    resetLink,
    provider: 'Resend (REST API)'
  };
}

/**
 * Envia o e-mail transacional com o link de recuperação de senha.
 * Detecta automaticamente o provedor (Resend re_..., Brevo xkeysib-..., SMTP padrão)
 * e prioriza a rota correta com fallback de contingência.
 * 
 * @param {Object} params
 * @param {string} params.toEmail - E-mail do destinatário
 * @param {string} params.userName - Nome do usuário
 * @param {string} params.resetToken - Token de recuperação único gerado
 * @returns {Promise<Object>}
 */
export async function sendPasswordResetEmail({ toEmail, userName, resetToken }) {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const resetLink = `${appUrl}/#reset-token=${resetToken}`;
  const fromAddress = getResolvedFromAddress();

  const user = process.env.SMTP_USER?.trim().replace(/^["']|["']$/g, '');
  const pass = process.env.SMTP_PASS?.trim().replace(/^["']|["']$/g, '');
  const resendApiKey = (process.env.RESEND_API_KEY?.trim().replace(/^["']|["']$/g, '')) || (pass && pass.startsWith('re_') ? pass : null);
  const brevoApiKey = (process.env.BREVO_API_KEY?.trim().replace(/^["']|["']$/g, '')) || (pass && pass.startsWith('xkeysib-') ? pass : null);

  // Validação preventiva de configuração
  if ((!user || !pass) && !brevoApiKey && !resendApiKey) {
    console.error('[Auth-Email] Nenhuma credencial de e-mail (Resend, Brevo ou SMTP) configurada no .env!');
    console.log(`[Auth-Email] [DEBUG / FALLBACK] Link de recuperação gerado: ${resetLink}`);
    throw new Error('Credenciais de e-mail não configuradas no .env. Defina RESEND_API_KEY, ou SMTP_USER e SMTP_PASS.');
  }

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Recuperação de Senha - Catálogo Tom Hanks</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f1117; color: #f3f4f6; margin: 0; padding: 20px; }
      .container { max-width: 560px; margin: 0 auto; background-color: #1a1d27; border-radius: 12px; border: 1px solid #2e3447; overflow: hidden; }
      .header { background: linear-gradient(135deg, #1f2333 0%, #131622 100%); padding: 30px; text-align: center; border-bottom: 2px solid #eab308; }
      .header h1 { margin: 0; color: #eab308; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
      .header p { margin: 6px 0 0 0; color: #9ca3af; font-size: 14px; }
      .body { padding: 30px; line-height: 1.6; color: #d1d5db; }
      .greeting { font-size: 18px; font-weight: 600; color: #ffffff; margin-bottom: 15px; }
      .btn-container { text-align: center; margin: 30px 0; }
      .btn { display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%); color: #000000 !important; font-weight: 700; text-decoration: none; border-radius: 8px; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(234, 179, 8, 0.3); }
      .warning-box { background-color: #262114; border-left: 4px solid #eab308; padding: 14px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #fef08a; }
      .footer { background-color: #131622; padding: 20px 30px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #2e3447; }
      .raw-link { word-break: break-all; color: #38bdf8; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎬 Catálogo Tom Hanks</h1>
        <p>Microsserviço de Autenticação · ISW055</p>
      </div>
      <div class="body">
        <div class="greeting">Olá, ${userName || 'Usuário'}!</div>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Catálogo de Filmes Tom Hanks</strong>.</p>
        <p>Para prosseguir e escolher uma nova senha de acesso, clique no botão abaixo:</p>
        
        <div class="btn-container">
          <a href="${resetLink}" class="btn" target="_blank">Redefinir Minha Senha</a>
        </div>

        <div class="warning-box">
          ⏱️ <strong>Atenção:</strong> Este link é de uso único e é válido por <strong>30 minutos</strong> a partir do momento em que foi solicitado.
        </div>

        <p style="font-size: 13px; color: #9ca3af;">Se o botão acima não funcionar, copie e cole o seguinte link no seu navegador:</p>
        <p class="raw-link">${resetLink}</p>

        <p style="font-size: 12px; color: #6b7280; margin-top: 25px;">Se você não solicitou a alteração da sua senha, nenhuma ação é necessária. Sua senha continuará segura.</p>
      </div>
      <div class="footer">
        Catálogo de Filmes Tom Hanks &bull; Microsserviço Desacoplado &bull; Disciplina ISW055
      </div>
    </div>
  </body>
  </html>
  `;

  const textContent = `
Olá, ${userName || 'Usuário'}!

Recebemos uma solicitação para redefinir a senha da sua conta no Catálogo de Filmes Tom Hanks.

Para redefinir sua senha, acesse o link abaixo:
${resetLink}

Atenção: Este link expira em 30 minutos e só pode ser utilizado uma única vez.

Se você não solicitou a alteração de senha, ignore esta mensagem.
  `.trim();

  // 1. Se possuir chave da Resend (re_...), envia diretamente via Resend REST API
  if (resendApiKey) {
    console.log('[Auth-Email] Enviando e-mail via Resend REST API...');
    try {
      return await sendViaResendApi({
        toEmail,
        userName,
        resetLink,
        htmlContent,
        textContent,
        apiKey: resendApiKey,
        fromAddress: process.env.SMTP_FROM || 'Catálogo Filmes <onboarding@resend.dev>'
      });
    } catch (resendErr) {
      console.error('[Auth-Email] Falha ao enviar via Resend API:', resendErr.message);
      console.log(`[Auth-Email] [DEBUG / FALLBACK] Link de recuperação gerado: ${resetLink}`);
      throw resendErr;
    }
  }

  // 2. Se a chave fornecida for uma API Key da Brevo (xkeysib-...) ou modo API estiver ativo
  const isDirectApi = Boolean(
    brevoApiKey && (process.env.BREVO_USE_API === 'true' || (pass && pass.startsWith('xkeysib-')) || !user)
  );

  if (isDirectApi) {
    console.log('[Auth-Email] Enviando e-mail via Brevo REST API...');
    try {
      return await sendViaBrevoApi({
        toEmail,
        userName,
        resetLink,
        htmlContent,
        textContent,
        apiKey: brevoApiKey,
        fromAddress
      });
    } catch (apiErr) {
      console.error(`[Auth-Email] Falha ao enviar via Brevo API:`, apiErr.message);
      console.log(`[Auth-Email] [DEBUG / FALLBACK] Link de recuperação gerado: ${resetLink}`);
      throw apiErr;
    }
  }

  // Envio padrão via Brevo SMTP (Nodemailer)
  console.log(`[Auth-Email] Enviando e-mail via Brevo SMTP (${process.env.SMTP_HOST || 'smtp-relay.brevo.com'}:587)...`);
  const transporter = createTransporter();

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: '🔑 Recuperação de Senha — Catálogo de Filmes Tom Hanks',
      text: textContent,
      html: htmlContent
    });

    console.log(`[Auth-Email] E-mail de recuperação enviado para ${toEmail} via Brevo SMTP. MessageId: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      resetLink,
      provider: 'Brevo (SMTP)'
    };
  } catch (err) {
    console.error(`[Auth-Email] Falha ao enviar e-mail via Brevo SMTP:`, err.message);

    // Fallback para Brevo REST API se houver chave API disponível
    if (brevoApiKey) {
      console.log('[Auth-Email] Tentando contingência automática via Brevo REST API...');
      try {
        return await sendViaBrevoApi({
          toEmail,
          userName,
          resetLink,
          htmlContent,
          textContent,
          apiKey: brevoApiKey,
          fromAddress
        });
      } catch (fallbackErr) {
        console.error('[Auth-Email] Contingência Brevo API também falhou:', fallbackErr.message);
      }
    }

    console.log(`[Auth-Email] [DEBUG / FALLBACK] Link de recuperação gerado: ${resetLink}`);
    
    if (err.message && (err.message.includes('550') || err.message.includes('Sender'))) {
      console.error('[Auth-Email] [Dica Brevo] Certifique-se de que o remetente (SMTP_FROM) é um e-mail verificado no painel da Brevo.');
    }

    throw new Error(`Falha no envio de e-mail via Brevo: ${err.message}`);
  }
}

/**
 * Testa e valida a conectividade e credenciais da Brevo (SMTP ou REST API).
 * Retorna status detalhado sobre a conexão, credenciais e remetentes autorizados.
 *
 * @returns {Promise<Object>}
 */
export async function verifyBrevoConnection() {
  const user = process.env.SMTP_USER?.trim().replace(/^["']|["']$/g, '');
  const pass = process.env.SMTP_PASS?.trim().replace(/^["']|["']$/g, '');
  const resendApiKey = (process.env.RESEND_API_KEY?.trim().replace(/^["']|["']$/g, '')) || (pass && pass.startsWith('re_') ? pass : null);
  const brevoApiKey = (process.env.BREVO_API_KEY?.trim().replace(/^["']|["']$/g, '')) || (pass && pass.startsWith('xkeysib-') ? pass : null);

  if ((!user || !pass) && !brevoApiKey && !resendApiKey) {
    return {
      configured: false,
      valid: false,
      message: 'Nenhuma credencial de e-mail encontrada (defina RESEND_API_KEY, ou SMTP_USER e SMTP_PASS no .env).'
    };
  }

  // 0. Se for chave da Resend (re_...)
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/api-keys', {
        headers: {
          'Authorization': `Bearer ${resendApiKey}`
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          configured: true,
          mode: 'REST API',
          provider: 'Resend',
          valid: false,
          error: data.message || `HTTP ${response.status} na API da Resend`
        };
      }

      return {
        configured: true,
        mode: 'REST API',
        provider: 'Resend',
        valid: true,
        resolvedSender: process.env.SMTP_FROM || 'Catálogo Filmes <onboarding@resend.dev>'
      };
    } catch (err) {
      return {
        configured: true,
        mode: 'REST API',
        provider: 'Resend',
        valid: false,
        error: `Erro de conexão com API Resend: ${err.message}`
      };
    }
  }

  // 1. Se possuir chave de API REST da Brevo
  if (brevoApiKey) {
    try {
      const response = await fetch('https://api.brevo.com/v3/account', {
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          configured: true,
          mode: 'REST API',
          valid: false,
          error: data.message || `HTTP ${response.status} na API da Brevo`
        };
      }

      const accountData = await response.json();
      const senders = await getBrevoVerifiedSenders(brevoApiKey);

      return {
        configured: true,
        mode: 'REST API',
        valid: true,
        accountEmail: accountData.email,
        companyName: accountData.companyName,
        plan: accountData.plan?.map(p => p.type).join(', ') || 'free',
        senders: senders.map(s => ({ email: s.email, name: s.name, active: s.active })),
        resolvedSender: getResolvedFromAddress(senders)
      };
    } catch (err) {
      return {
        configured: true,
        mode: 'REST API',
        valid: false,
        error: `Erro de conexão com API Brevo: ${err.message}`
      };
    }
  }

  // 2. Se for modo SMTP com Nodemailer
  const transporter = createTransporter();
  try {
    await transporter.verify();
    return {
      configured: true,
      mode: 'SMTP',
      valid: true,
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user,
      resolvedSender: getResolvedFromAddress()
    };
  } catch (err) {
    return {
      configured: true,
      mode: 'SMTP',
      valid: false,
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user,
      error: `Erro de conexão/autenticação SMTP: ${err.message}`,
      resolvedSender: getResolvedFromAddress()
    };
  }
}

export const verifyEmailConnection = verifyBrevoConnection;



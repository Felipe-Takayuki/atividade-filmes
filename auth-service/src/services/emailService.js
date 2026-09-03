import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Utilitário para extrair nome e e-mail de strings no formato "Nome <email@dominio.com>" ou "email@dominio.com".
 */
function parseFromAddress(fromStr) {
  if (!fromStr) {
    return { name: 'Catálogo Filmes', email: 'noreply@catalogofilmes.com' };
  }
  const match = fromStr.match(/^(?:(?:"?([^"]*)"?\s*)?<([^>]+)>|([^<]+))$/);
  if (match) {
    const name = (match[1] || match[3] || 'Catálogo Filmes').trim();
    const email = (match[2] || match[3] || '').trim();
    return { name, email };
  }
  return { name: 'Catálogo Filmes', email: fromStr.trim() };
}

/**
 * Resolve o remetente padrão para a Brevo.
 * Na Brevo, o remetente DEVE ser um e-mail verificado no painel da conta.
 */
function getResolvedFromAddress() {
  if (process.env.SMTP_FROM && !process.env.SMTP_FROM.includes('.local')) {
    return process.env.SMTP_FROM;
  }
  // Se SMTP_USER for um e-mail válido (login da conta Brevo), usa-o como remetente automático
  if (process.env.SMTP_USER && process.env.SMTP_USER.includes('@') && !process.env.SMTP_USER.endsWith('@smtp-brevo.com')) {
    return `Catálogo Filmes <${process.env.SMTP_USER}>`;
  }
  return process.env.SMTP_FROM || 'Catálogo Filmes <noreply@catalogofilmes.com>';
}

/**
 * Cria e configura o transporte de e-mail SMTP via Brevo (smtp-relay.brevo.com).
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const isSecure = port === 465;

  const transportConfig = {
    host,
    port,
    secure: isSecure,
    auth: user && pass ? { user, pass } : undefined,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  };

  return nodemailer.createTransport(transportConfig);
}

/**
 * Envia e-mail diretamente via API REST da Brevo (HTTPS porta 443).
 * Útil quando portas SMTP (587/465) estão bloqueadas na hospedagem ou pelo provedor.
 */
async function sendViaBrevoApi({ toEmail, userName, resetLink, htmlContent, textContent, apiKey, fromAddress }) {
  const sender = parseFromAddress(fromAddress);
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
 * Envia o e-mail transacional com o link de recuperação de senha.
 * Prioriza Brevo via SMTP (Nodemailer) e suporta envio via Brevo REST API como alternativa/fallback.
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

  // Detecta se foi configurada a chave de API da Brevo
  const brevoApiKey = process.env.BREVO_API_KEY || (process.env.SMTP_PASS && process.env.SMTP_PASS.startsWith('xkeysib-') ? process.env.SMTP_PASS : null);
  const useBrevoApi = Boolean(process.env.BREVO_USE_API === 'true' || (brevoApiKey && !process.env.SMTP_USER));

  // 1. Envio via Brevo REST API se explicitamente configurado ou sem usuário SMTP
  if (useBrevoApi && brevoApiKey) {
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

  // 2. Envio via Brevo SMTP (Nodemailer)
  const transporter = createTransporter();

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: '🔑 Recuperação de Senha — Catálogo de Filmes Tom Hanks',
      text: textContent,
      html: htmlContent
    });

    console.log(`[Auth-Email] E-mail de recuperação enviado para ${toEmail} via Brevo SMTP (${process.env.SMTP_HOST || 'smtp-relay.brevo.com'}). MessageId: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      resetLink,
      provider: 'Brevo (SMTP)'
    };
  } catch (err) {
    console.error(`[Auth-Email] Falha ao enviar e-mail via Brevo SMTP (${process.env.SMTP_HOST || 'smtp-relay.brevo.com'}):`, err.message);

    // Tentativa automática de fallback para a API Brevo se houver chave disponível
    if (brevoApiKey && !useBrevoApi) {
      console.log('[Auth-Email] Tentando envio de contingência via Brevo REST API...');
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
    
    // Alerta específico sobre remetente não validado na Brevo
    if (err.message && (err.message.includes('550') || err.message.includes('Sender'))) {
      console.error('[Auth-Email] [Dica Brevo] Certifique-se de que o remetente (SMTP_FROM) é um e-mail validado no painel da sua conta Brevo.');
    }

    throw new Error(`Falha no envio de e-mail via Brevo: ${err.message}`);
  }
}

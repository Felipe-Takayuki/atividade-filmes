import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Cria e configura o transporte de e-mail SMTP.
 * Suporta Mailtrap (Dev) e Brevo / Provedores SMTP genéricos (Prod).
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io';
  const port = parseInt(process.env.SMTP_PORT || '2525', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const isSecure = port === 465;

  const transportConfig = {
    host,
    port,
    secure: isSecure,
    auth: user && pass ? { user, pass } : undefined
  };

  return nodemailer.createTransport(transportConfig);
}

/**
 * Envia o e-mail transacional com o link de recuperação de senha.
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
  const fromAddress = process.env.SMTP_FROM || 'Catálogo Filmes <noreply@catalogofilmes.local>';

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

  const transporter = createTransporter();

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: '🔑 Recuperação de Senha — Catálogo de Filmes Tom Hanks',
      text: textContent,
      html: htmlContent
    });

    console.log(`[Auth-Email] E-mail de recuperação enviado para ${toEmail}. MessageId: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      resetLink
    };
  } catch (err) {
    console.error(`[Auth-Email] Falha ao enviar e-mail via SMTP (${process.env.SMTP_HOST || 'Mailtrap'}):`, err.message);
    console.log(`[Auth-Email] [DEBUG / FALLBACK] Link de recuperação gerado: ${resetLink}`);
    // Lança erro para informar que houve problema no envio real de e-mail
    throw new Error(`Falha no envio de e-mail: ${err.message}`);
  }
}

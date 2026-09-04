import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { sendPasswordResetEmail, verifyBrevoConnection } from './src/services/emailService.js';

// Carrega variáveis do .env do diretório atual ou raiz do projeto
dotenv.config();
if (!process.env.SMTP_USER && !process.env.BREVO_API_KEY && !process.env.SMTP_PASS) {
  const rootEnv = path.resolve(process.cwd(), '../.env');
  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  }
}

const arg = process.argv[2]?.trim();
const isCheckOnly = arg === '--check' || arg === '-c' || arg === '--verify';
const targetEmail = (!isCheckOnly && arg && arg.includes('@')) ? arg : (process.env.SMTP_USER && process.env.SMTP_USER.includes('@') && !process.env.SMTP_USER.endsWith('@smtp-brevo.com') ? process.env.SMTP_USER : null);

console.log('====================================================');
console.log('🔍 Diagnóstico & Teste de Conexão de E-mail (ISW055)');
console.log('====================================================');
console.log(`🌐 SMTP Host:         ${process.env.SMTP_HOST || '(padrão)'}`);
console.log(`🚪 SMTP Port:         ${process.env.SMTP_PORT || '587'}`);
console.log(`👤 SMTP User:         ${process.env.SMTP_USER ? process.env.SMTP_USER : '(não definido)'}`);
if (process.env.RESEND_API_KEY || (process.env.SMTP_PASS && process.env.SMTP_PASS.startsWith('re_'))) {
  const resendKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
  console.log(`🔑 Resend API Key:    ${resendKey.slice(0, 10)}...`);
}
if (process.env.BREVO_API_KEY) {
  console.log(`🔑 Brevo API Key:     ${process.env.BREVO_API_KEY.slice(0, 10)}...`);
}
console.log(`🔐 SMTP Pass:         ${process.env.SMTP_PASS ? `${process.env.SMTP_PASS.slice(0, 10)}...` : '(não definido)'}`);
console.log(`📨 Remetente (FROM):  ${process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM || '(padrão dinâmico)'}`);
console.log('----------------------------------------------------');

console.log('⏳ Testando credenciais e conexão com o provedor...');
const verification = await verifyBrevoConnection();

if (!verification.configured) {
  console.log('⚠️  Status: Nenhuma credencial de e-mail configurada no .env!');
  console.log(`ℹ️  Mensagem: ${verification.message}`);
  console.log('\n💡 Opções de configuração no arquivo .env:');
  console.log('   Opção 1 (Resend - Recomendada):');
  console.log('     RESEND_API_KEY=re_sua_chave_aqui');
  console.log('     SMTP_FROM="Catálogo Filmes <onboarding@resend.dev>"');
  console.log('   Opção 2 (Gmail / SMTP):');
  console.log('     SMTP_HOST=smtp.gmail.com');
  console.log('     SMTP_PORT=587');
  console.log('     SMTP_USER=seu_email@gmail.com');
  console.log('     SMTP_PASS=sua_senha_de_app_16_letras');
  console.log('     SMTP_FROM="Catálogo Filmes <seu_email@gmail.com>"');
  process.exit(1);
}

if (!verification.valid) {
  console.error(`❌ Falha na validação do modo [${verification.mode}]:`);
  console.error(`   Erro: ${verification.error}`);
  console.log('\n💡 Checklist de Solução para Brevo:');
  console.log('1. Remetente Verificado: Na Brevo (Senders & IP > Senders), confirme se o e-mail de remetente está aprovado.');
  console.log('2. Chave SMTP vs API:');
  console.log('   - Chaves iniciadas em "xsmtpsib-" são para SMTP (coloque em SMTP_PASS).');
  console.log('   - Chaves iniciadas em "xkeysib-" são para REST API (coloque em BREVO_API_KEY ou SMTP_PASS).');
  console.log('3. Se estiver no Portainer, adicione as mesmas variáveis na aba Environment da Stack!');
  process.exit(1);
}

console.log(`✅ Conexão validada com sucesso via [${verification.provider || 'SMTP'}] (${verification.mode})!`);
if (verification.accountEmail) {
  console.log(`👤 Conta:              ${verification.accountEmail} (${verification.companyName || 'Empresa'})`);
  console.log(`📦 Plano:              ${verification.plan}`);
}
if (verification.senders && verification.senders.length > 0) {
  console.log('📧 Remetentes Ativos:  ' + verification.senders.filter(s => s.active).map(s => s.email).join(', '));
}
console.log(`📤 Remetente Efetivo:  ${verification.resolvedSender}`);
console.log('----------------------------------------------------');

// Se o usuário solicitou apenas verificação (--check ou sem e-mail alvo)
if (isCheckOnly || !targetEmail) {
  console.log('ℹ️  Diagnóstico concluído com sucesso!');
  console.log('   Para disparar um e-mail de teste real com token de recuperação, execute:');
  console.log('   node test-email.js seu-email@gmail.com');
  process.exit(0);
}

// Disparo de e-mail de teste real
console.log(`🚀 Disparando e-mail transacional de teste para: ${targetEmail}...`);
try {
  const result = await sendPasswordResetEmail({
    toEmail: targetEmail,
    userName: 'Usuário Teste',
    resetToken: 'token_teste_' + Math.random().toString(36).substring(2, 10)
  });

  console.log('🎉 SUCESSO! E-mail de recuperação enviado com sucesso!');
  console.log(`📦 Provedor Utilizado: ${result.provider}`);
  console.log(`🆔 MessageId:          ${result.messageId}`);
  console.log(`🔗 Link de Redefinição Gerado: ${result.resetLink}`);
  console.log(`\n📬 Verifique a caixa de entrada (ou pasta Spam) de: ${targetEmail}`);
} catch (sendErr) {
  console.error('\n❌ ERRO NO DISPARO DO E-MAIL:');
  console.error(sendErr.message);
  process.exit(1);
}

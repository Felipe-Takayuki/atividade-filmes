import dotenv from 'dotenv';
import { sendPasswordResetEmail } from './src/services/emailService.js';

dotenv.config();

const targetEmail = process.argv[2] || process.env.SMTP_USER;

if (!targetEmail) {
  console.error('❌ Por favor, informe o e-mail de destino:');
  console.error('   node test-email.js seu-email@gmail.com');
  process.exit(1);
}

console.log('🔍 Testando envio de e-mail via Brevo...');
console.log(`📧 Destinatário: ${targetEmail}`);
console.log(`🌐 SMTP Host: ${process.env.SMTP_HOST || 'smtp-relay.brevo.com'}`);
console.log(`🚪 SMTP Port: ${process.env.SMTP_PORT || '587'}`);
console.log(`👤 SMTP User: ${process.env.SMTP_USER ? process.env.SMTP_USER : '(não definido)'}`);
console.log(`🔑 SMTP Pass / Key: ${process.env.SMTP_PASS ? `${process.env.SMTP_PASS.slice(0, 8)}...` : (process.env.BREVO_API_KEY ? `${process.env.BREVO_API_KEY.slice(0, 8)}...` : '(não definido)')}`);
console.log(`📨 SMTP From: ${process.env.SMTP_FROM || '(padrão dinâmico)'}`);
console.log('----------------------------------------------------');

try {
  const result = await sendPasswordResetEmail({
    toEmail: targetEmail,
    userName: 'Usuário Teste',
    resetToken: 'teste123abc'
  });
  console.log('✅ SUCESSO!');
  console.log('Resultado:', result);
  console.log('Verifique a caixa de entrada (ou pasta de Spam) do e-mail:', targetEmail);
} catch (err) {
  console.error('❌ ERRO NO ENVIO:');
  console.error(err.message);
  console.log('\n💡 Checklist de Solução para Brevo:');
  console.log('1. Remetente Verificado: Na Brevo (Senders & IP > Senders), confirme se o e-mail de remetente está aprovado.');
  console.log('2. Chave SMTP vs API:');
  console.log('   - Se a chave começar com "xsmtpsib-", ela é SMTP.');
  console.log('   - Se a chave começar com "xkeysib-", ela é REST API (o serviço agora detecta automaticamente).');
  console.log('3. Variáveis no Portainer: Se estiver rodando no Portainer/Docker, adicione as variáveis no painel da Stack!');
  process.exit(1);
}

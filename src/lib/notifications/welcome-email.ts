import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendGmailSmtpMessage } from './gmail-smtp';

const PORTAL_URL = 'https://portal.consultservices.com.br/entrar';

/** Optional transactional welcome email, at most one attempt per identity. */
export async function sendWelcomeEmailIfConfigured(authUserId: string): Promise<void> {
  const username = process.env.WELCOME_SMTP_USER;
  const appPassword = process.env.WELCOME_SMTP_APP_PASSWORD;
  if (!username || !appPassword) return;
  const db = createAdminClient();
  const { data: identity, error } = await db.from('identities')
    .select('id,email,first_name,status,activated_at')
    .eq('auth_user_id', authUserId).eq('status', 'ACTIVE').maybeSingle();
  if (error || !identity?.id || !identity.email || !identity.activated_at) return;
  const activationAge = Date.now() - new Date(identity.activated_at).getTime();
  // Recoveries of an already active account must not trigger welcome emails.
  if (!Number.isFinite(activationAge) || activationAge < 0 || activationAge > 15 * 60 * 1000) return;

  const reserved = await db.from('welcome_email_deliveries')
    .insert({ identity_id: identity.id, status: 'RESERVED' })
    .select('identity_id').maybeSingle();
  if (reserved.error || !reserved.data) return;

  const firstName = String(identity.first_name ?? '').trim().slice(0, 80);
  const greeting = firstName ? `Olá, ${firstName}!` : 'Olá!';
  const text = [
    greeting, '',
    'Seu cadastro no Portal Consult Services foi concluído.',
    'Acesse seus sistemas contratados pelo endereço:',
    PORTAL_URL, '',
    'Entre com o e-mail cadastrado e a senha que você definiu.',
    'Em Meu Portal, selecione o sistema que deseja acessar.',
    'Esqueceu a senha? Use a opção de recuperação na página de entrada.', '',
    'Salve este link nos seus favoritos.',
    'Equipe Consult Services',
  ].join('\n');
  let success = false;
  try {
    await sendGmailSmtpMessage({
      username,
      appPassword,
      recipient: identity.email,
      subject: 'Seu acesso ao Portal Consult Services está pronto',
      text,
    });
    success = true;
  } catch {
    // No SMTP response payload, credentials, or recipient is logged.
    success = false;
  }
  const update = await db.from('welcome_email_deliveries')
    .update({ status: success ? 'SENT' : 'FAILED', updated_at: new Date().toISOString() })
    .eq('identity_id', identity.id).eq('status', 'RESERVED');
  if (update.error || !success) console.warn('[welcome-email] SMTP acceptance not confirmed');
}

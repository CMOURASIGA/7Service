'use server';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export interface GrantAccessFormState {
  error: string | null;
}
export async function grantAccessAction(
  identityId: string,
  _previous: GrantAccessFormState,
  form: FormData,
): Promise<GrantAccessFormState> {
  const { internalUser } = await requirePermission('users.access.manage');
  try {
    const subscriptionId = String(form.get('subscriptionId') ?? '');
    const roleId = String(form.get('productRoleId') ?? '');
    const { error } = await createAdminClient().rpc('grant_product_access_atomic', {
      p_actor: internalUser.id,
      p_identity: identityId,
      p_subscription: subscriptionId,
      p_role: roleId,
    });
    if (error)
      return {
        error: 'Não foi possível conceder acesso. Confira vínculo, licença, vigência e perfil.',
      };
    revalidatePath('/usuarios/' + identityId);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Falha ao conceder acesso.' };
  }
}
async function changeStatus(
  accessId: string,
  identityId: string,
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED',
  reason: string | null,
) {
  const { internalUser } = await requirePermission('users.access.manage');
  const { error } = await createAdminClient().rpc('change_product_access_status_atomic', {
    p_actor: internalUser.id,
    p_access: accessId,
    p_identity: identityId,
    p_status: status,
    p_reason: reason,
  });
  if (error) throw new Error('Não foi possível alterar o acesso e registrar a auditoria.');
  revalidatePath('/usuarios/' + identityId);
}
export async function suspendAccessAction(accessId: string, identityId: string, form: FormData) {
  return changeStatus(
    accessId,
    identityId,
    'SUSPENDED',
    String(form.get('reason') ?? '').trim() || null,
  );
}
export async function reactivateAccessAction(
  accessId: string,
  identityId: string,
  _form: FormData,
) {
  return changeStatus(accessId, identityId, 'ACTIVE', null);
}
export async function revokeAccessAction(accessId: string, identityId: string, form: FormData) {
  return changeStatus(
    accessId,
    identityId,
    'REVOKED',
    String(form.get('reason') ?? '').trim() || null,
  );
}
export async function initiateRecoveryAction(identityId: string, _form: FormData) {
  const { internalUser } = await requirePermission('recovery.initiate');
  const db = createAdminClient();
  const { data: identity, error } = await db
    .from('identities')
    .select('id,email,auth_user_id,status')
    .eq('id', identityId)
    .maybeSingle();
  if (error || !identity || !identity.auth_user_id || identity.status === 'REMOVED')
    throw new Error('Identidade nao habilitada para recuperacao.');
  const { error: resetError } = await db.auth.resetPasswordForEmail(identity.email);
  if (resetError) throw new Error('Nao foi possivel solicitar recuperacao.');
  const { error: auditError } = await db.from('audit_logs').insert({
    actor_internal_user_id: internalUser.id,
    action: 'identity.recovery_requested',
    target_type: 'identity',
    target_id: identityId,
    source: '7service',
  });
  if (auditError) throw new Error('Recuperacao solicitada, mas auditoria falhou.');
  revalidatePath('/usuarios/' + identityId);
}

/**
 * Correct a mistyped address before the account is ever activated.
 * Preserve identity ID, membership, grants and Auth UID; never touch an active user.
 */
export async function correctPendingIdentityEmailAction(
  identityId: string,
  _previous: { error: string | null; success?: string },
  form: FormData,
): Promise<{ error: string | null; success?: string }> {
  const { internalUser } = await requirePermission('users.manage');
  const requestedEmail = String(form.get('newEmail') ?? '')
    .trim()
    .toLowerCase();
  const reason = String(form.get('reason') ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail) || requestedEmail.length > 254)
    return { error: 'Informe um e-mail válido.' };
  if (reason.length < 8)
    return { error: 'Informe o motivo da correção (mínimo 8 caracteres).' };

  const db = createAdminClient();
  const { data: identity, error: identityError } = await db
    .from('identities')
    .select('id,email,status,auth_user_id,activated_at')
    .eq('id', identityId)
    .maybeSingle();
  if (identityError || !identity) return { error: 'Identidade não encontrada.' };
  const previousEmail = identity.email.toLowerCase();
  if (previousEmail === requestedEmail) return { error: 'O novo e-mail deve ser diferente.' };
  if (identity.status !== 'PENDING_INVITE' || identity.activated_at || !identity.auth_user_id)
    return { error: 'Correção administrativa disponível apenas antes da ativação.' };
  const [collision, grants, invitations] = await Promise.all([
    db.from('identities').select('id').ilike('email', requestedEmail).neq('id', identityId).limit(1),
    db.from('user_product_access').select('id').eq('identity_id', identityId).limit(1),
    db.from('invitations').select('id').eq('identity_id', identityId).eq('status', 'SENT'),
  ]);
  if (collision.error || grants.error || invitations.error)
    return { error: 'Não foi possível validar a situação cadastral.' };
  if (collision.data?.length)
    return { error: 'O endereço informado já pertence a outra identidade.' };
  if (grants.data?.length)
    return { error: 'Há acessos associados. Solicite revisão administrativa.' };

  const { data: existingAuth, error: authError } = await db.auth.admin.getUserById(
    identity.auth_user_id,
  );
  if (authError || !existingAuth.user) return { error: 'Conta Auth não localizada.' };
  if (
    existingAuth.user.email?.toLowerCase() !== previousEmail ||
    existingAuth.user.email_confirmed_at ||
    existingAuth.user.last_sign_in_at
  )
    return { error: 'A conta Auth já foi utilizada ou diverge do cadastro. Correção bloqueada.' };

  // Never modify auth.users by SQL; the Auth Admin API enforces email uniqueness.
  const { error: updateAuthError } = await db.auth.admin.updateUserById(identity.auth_user_id, {
    email: requestedEmail,
  });
  if (updateAuthError)
    return { error: 'Não foi possível corrigir o endereço no Auth. Verifique duplicidade.' };

  const { data: updatedIdentity, error: updateIdentityError } = await db
    .from('identities')
    .update({ email: requestedEmail })
    .eq('id', identityId)
    .eq('status', 'PENDING_INVITE')
    .eq('email', identity.email)
    .select('id');
  if (updateIdentityError || updatedIdentity?.length !== 1) {
    const rollback = await db.auth.admin.updateUserById(identity.auth_user_id, {
      email: previousEmail,
    });
    return {
      error: rollback.error
        ? 'Correção parcial entre Auth e identidade. Bloqueie novos convites e solicite conciliação.'
        : 'Correção não concluída. O endereço anterior foi restaurado.',
    };
  }

  // A SENT receipt records the request, not verified inbox delivery.
  const { error: cancelError } = await db
    .from('invitations')
    .update({ status: 'CANCELLED', cancelled_at: new Date().toISOString() })
    .eq('identity_id', identityId)
    .eq('status', 'SENT');
  const { error: auditError } = await db.from('audit_logs').insert({
    actor_internal_user_id: internalUser.id,
    action: 'identity.pending_email_corrected',
    target_type: 'identity',
    target_id: identityId,
    source: '7service',
    before_json: { email: previousEmail },
    after_json: { email: requestedEmail },
    reason,
  });
  if (auditError || cancelError)
    return { error: 'E-mail corrigido, mas auditoria ou histórico pendente. Não reenvie até conciliar.' };
  revalidatePath('/usuarios');
  revalidatePath('/usuarios/' + identityId);
  return {
    error: null,
    success: 'E-mail corrigido na identidade e no Auth. Solicite um novo convite para este endereço.',
  };
}

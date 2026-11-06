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

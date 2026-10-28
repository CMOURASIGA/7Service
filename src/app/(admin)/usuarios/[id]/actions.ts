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
    const db = createAdminClient();
    const [sub, identity, role] = await Promise.all([
      db
        .from('subscriptions')
        .select('id,client_id,product_id,status,start_date,end_date,grace_days,license_limit')
        .eq('id', subscriptionId)
        .single(),
      db.from('identities').select('id,status').eq('id', identityId).single(),
      db.from('product_roles').select('id,product_id,status').eq('id', roleId).single(),
    ]);
    if (sub.error || identity.error || role.error || !sub.data || !identity.data || !role.data)
      return { error: 'Identidade, assinatura ou perfil nao encontrado.' };
    if (identity.data.status !== 'ACTIVE' && identity.data.status !== 'PENDING_INVITE')
      return { error: 'Identidade bloqueada.' };
    if (role.data.product_id !== sub.data.product_id || role.data.status !== 'ACTIVE')
      return { error: 'Perfil nao corresponde ao produto da assinatura.' };
    const { data: membership, error: membershipError } = await db
      .from('client_memberships')
      .select('id,status')
      .eq('identity_id', identityId)
      .eq('client_id', sub.data.client_id)
      .eq('status', 'ACTIVE')
      .maybeSingle();
    if (membershipError || !membership)
      return { error: 'Usuario nao possui vinculo ativo com esta empresa.' };
    const today = new Date().toISOString().slice(0, 10);
    if (
      sub.data.status !== 'ACTIVE' ||
      sub.data.start_date > today ||
      (sub.data.end_date &&
        Date.parse(today + 'T00:00:00Z') >
          Date.parse(sub.data.end_date + 'T00:00:00Z') + sub.data.grace_days * 86400000)
    )
      return { error: 'Assinatura sem vigencia que permita acesso.' };
    const { data: accesses, error: readError } = await db
      .from('user_product_access')
      .select('id,status')
      .eq('subscription_id', subscriptionId);
    const { data: overrides, error: overrideError } = await db
      .from('license_overrides')
      .select('extra_licenses')
      .eq('subscription_id', subscriptionId);
    if (readError || overrideError) throw new Error('Falha ao apurar licencas.');
    const used = (accesses ?? []).filter((a) => ['PENDING', 'ACTIVE'].includes(a.status)).length;
    const limit =
      sub.data.license_limit + (overrides ?? []).reduce((sum, x) => sum + x.extra_licenses, 0);
    if (used >= limit) return { error: 'Limite de licencas atingido.' };
    const { data: created, error: insertError } = await db
      .from('user_product_access')
      .insert({
        identity_id: identityId,
        subscription_id: subscriptionId,
        product_role_id: roleId,
        membership_id: membership.id,
        client_id: sub.data.client_id,
        status: 'PENDING',
      })
      .select('id')
      .single();
    if (insertError || !created)
      throw insertError ?? new Error('Nao foi possivel conceder acesso.');
    const { error: auditError } = await db.from('audit_logs').insert({
      actor_internal_user_id: internalUser.id,
      action: 'access.granted',
      target_type: 'user_product_access',
      target_id: created.id,
      client_id: sub.data.client_id,
      product_id: sub.data.product_id,
      source: '7service',
    });
    if (auditError) throw new Error('Acesso cadastrado; auditoria pendente de conciliacao.');
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

'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export type LicenseOverrideState = { error: string | null; success?: string };
export async function grantLicenseOverrideAction(
  _previous: LicenseOverrideState,
  form: FormData,
): Promise<LicenseOverrideState> {
  const { internalUser } = await requirePermission('licenses.override');
  const subscriptionId = String(form.get('subscriptionId') ?? '');
  const extraLicenses = Number(form.get('extraLicenses') ?? NaN);
  const reason = String(form.get('reason') ?? '').trim();
  if (
    !/^[0-9a-f-]{36}$/i.test(subscriptionId) ||
    !Number.isSafeInteger(extraLicenses) ||
    extraLicenses < 1 ||
    extraLicenses > 10000 ||
    reason.length < 10
  )
    return {
      error: 'Informe licença adicional válida e justificativa com pelo menos 10 caracteres.',
    };
  const db = createAdminClient();
  const { data: subscription, error: readError } = await db
    .from('subscriptions')
    .select('id,client_id,product_id,status')
    .eq('id', subscriptionId)
    .maybeSingle();
  if (readError || !subscription || subscription.status !== 'ACTIVE')
    return { error: 'Assinatura inexistente ou não ativa.' };
  const { data: override, error } = await db
    .from('license_overrides')
    .insert({
      subscription_id: subscriptionId,
      granted_by: internalUser.id,
      reason,
      extra_licenses: extraLicenses,
    })
    .select('id')
    .single();
  if (error || !override) return { error: 'Falha ao conceder exceção de licenças.' };
  const { error: auditError } = await db.from('audit_logs').insert({
    actor_internal_user_id: internalUser.id,
    action: 'licenses.override_granted',
    target_type: 'license_override',
    target_id: override.id,
    client_id: subscription.client_id,
    product_id: subscription.product_id,
    reason,
    after_json: { extra_licenses: extraLicenses },
    source: '7service',
  });
  if (auditError)
    return { error: 'Licenças concedidas, mas auditoria não persistiu. Requer conciliação.' };
  revalidatePath('/licenciamento');
  return { error: null, success: 'Exceção de licenças registrada e auditada.' };
}

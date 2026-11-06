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
  const { error } = await createAdminClient().rpc('grant_license_override_atomic', {
    p_actor: internalUser.id,
    p_subscription: subscriptionId,
    p_extra: extraLicenses,
    p_reason: reason,
  });
  if (error) return { error: 'Não foi possível registrar a exceção de licenças com auditoria.' };
  revalidatePath('/licenciamento');
  return { error: null, success: 'Exceção de licenças registrada e auditada.' };
}

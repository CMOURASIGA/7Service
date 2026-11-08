'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { executeAuthProvisioning } from '@/lib/integrations/supabase-auth-provisioner';
import type { SealedCredential } from '@/lib/integrations/supabase-connector';
import type { ProvisioningIntent } from '@/lib/integrations/provisioning-intent';

export type DestinationProvisioningResult = { error: string | null; success?: string };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * INVITE is disabled by default, including on previews.
 * Enable only after end-to-end authorization adapters are validated for
 * the specific product. Never change the flag to true as a workaround.
 */
export async function inviteDestinationIdentity(
  _previous: DestinationProvisioningResult, form: FormData,
): Promise<DestinationProvisioningResult> {
  const { internalUser } = await requirePermission('users.access.manage');
  if (process.env.SERVICE_DESTINATION_PROVISIONING_ENABLED !== 'true')
    return { error: 'Provisionamento em preparação. Integração de perfis ainda não homologada.' };

  const accessId = String(form.get('accessId') ?? '');
  const environmentId = String(form.get('environmentId') ?? '');
  if (!uuid.test(accessId) || !uuid.test(environmentId))
    return { error: 'Concessão ou ambiente inválido.' };

  const db = createAdminClient();
  const ext = db as unknown as SupabaseClient;
  const { data: requestId, error: prepareError } = await ext.rpc(
    'prepare_destination_invitation_atomic',
    { p_actor: internalUser.id, p_access: accessId, p_environment: environmentId },
  );
  if (prepareError || typeof requestId !== 'string' || !uuid.test(requestId))
    return { error: 'A concessão não está elegível. Verifique licença, empresa, ambiente e conexão.' };

  const [operation, environment, connection, grant] = await Promise.all([
    ext.from('provisioning_operations').select('identity_id').eq('request_id', requestId).single(),
    db.from('product_environments').select('deployment_id').eq('id', environmentId).single(),
    ext.from('environment_connections')
      .select('project_url,encrypted_admin_key').eq('environment_id',environmentId)
      .eq('status','VERIFIED').single(),
    db.from('user_product_access').select('client_id,subscription_id').eq('id',accessId).single(),
  ]);
  if (operation.error || environment.error || connection.error || grant.error ||
      !operation.data || !environment.data || !connection.data || !grant.data)
    return { error: 'Preparação registrada, mas faltam dados para provisionar. Exige reconciliação.' };

  const [identity, subscription] = await Promise.all([
    db.from('identities').select('email').eq('id',operation.data.identity_id).single(),
    db.from('subscriptions').select('contract_id,product_id')
      .eq('id',grant.data.subscription_id).single(),
  ]);
  if (identity.error || subscription.error || !identity.data || !subscription.data)
    return { error: 'Identidade ou assinatura indisponível. Exige reconciliação.' };

  const intent: ProvisioningIntent = {
    requestId, operation: 'INVITE',
    centralIdentityId: operation.data.identity_id as string,
    contractId: subscription.data.contract_id,
    companyId: grant.data.client_id,
    productId: subscription.data.product_id,
    deploymentId: environment.data.deployment_id,
    environmentId, email: identity.data.email.toLowerCase(),
    localAuthUserId: null,
  };
  let localAuthUserId: string;
  try {
    const result = await executeAuthProvisioning(
      connection.data.project_url,
      connection.data.encrypted_admin_key as SealedCredential,
      intent,
    );
    localAuthUserId = result.localAuthUserId;
  } catch {
    return { error: 'Convite não confirmado no destino. Não repita até conciliar a operação.' };
  }

  const { error: finalizeError } = await ext.rpc('confirm_destination_invitation_atomic', {
    p_actor: internalUser.id, p_request: requestId,
    p_remote_auth_user: localAuthUserId,
    p_remote_email: intent.email,
  });
  if (finalizeError)
    return { error: 'Conta remota criada, mas vínculo central pendente. Exige reconciliação manual.' };

  revalidatePath('/acessos');
  return {
    error: null,
    success: 'Conta vinculada no Auth. A concessão final depende da confirmação do perfil no produto.',
  };
}

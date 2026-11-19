'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSupabaseProductProvisioningAdapter } from '@/lib/integrations/supabase-product-adapter';
import { verifyProductProvisioning } from '@/lib/integrations/product-provisioning-contract';
import type { SealedCredential } from '@/lib/integrations/supabase-connector';

export type RoleProvisioningState = { error: string | null; success?: string };
const uuid = z.string().uuid();
const requestSchema = z.object({
  requestId: uuid,
  centralIdentityId: uuid,
  remoteAuthUserId: uuid,
  companyId: uuid,
  remoteCompanyId: z.string().min(1).max(128),
  productCode: z.string().min(1).max(128),
  roleCode: z.string().min(1).max(128),
  action: z.literal('GRANT'),
});

export async function provisionPendingContractRole(
  _previous: RoleProvisioningState,
  form: FormData,
): Promise<RoleProvisioningState> {
  const { internalUser } = await requirePermission('users.access.manage');
  if (process.env.SERVICE_PRODUCT_PROFILE_PROVISIONING_ENABLED !== 'true')
    return { error: 'Integração de perfis indisponível até homologação do produto de destino.' };
  const assignment = uuid.safeParse(String(form.get('assignmentId') ?? ''));
  if (!assignment.success) return { error: 'Atribuição inválida.' };
  const db = createAdminClient() as unknown as SupabaseClient;
  const { data: prepared, error: prepareError } = await db.rpc(
    'prepare_contract_role_provisioning_atomic',
    {
      p_actor: internalUser.id,
      p_assignment: assignment.data,
    },
  );
  if (prepareError)
    return { error: 'A atribuição não possui autorização, licença ou identidade válida.' };

  const parsed = requestSchema.safeParse(prepared);
  if (!parsed.success)
    return {
      error: 'Operação iniciada, mas a resposta de preparação é inválida. Exige reconciliação.',
    };
  const request = parsed.data;

  async function markForReconciliation(): Promise<void> {
    const { error } = await db.rpc('mark_provisioning_reconciliation_atomic', {
      p_actor: internalUser.id,
      p_request: request.requestId,
      p_reason: 'DESTINATION_PROFILE_UNVERIFIED',
    });
    if (error) throw new Error('ROLE_RECONCILIATION_RECORD_FAILED');
  }

  const { data: assignmentRecord, error: assignmentError } = await db
    .from('contract_role_assignments')
    .select('environment_id')
    .eq('id', assignment.data)
    .single();
  if (assignmentError || !assignmentRecord) {
    await markForReconciliation();
    return { error: 'Ambiente da atribuição não identificado. Exige reconciliação.' };
  }

  const { data: connection, error: connectionError } = await db
    .from('environment_connections')
    .select('project_url,encrypted_admin_key,status')
    .eq('environment_id', assignmentRecord.environment_id)
    .single();
  if (connectionError || !connection || connection.status !== 'VERIFIED') {
    await markForReconciliation();
    return { error: 'Conexão de destino não verificada. Exige reconciliação.' };
  }

  try {
    const adapter = createSupabaseProductProvisioningAdapter(
      connection.project_url,
      connection.encrypted_admin_key as SealedCredential,
    );
    const receipt = await verifyProductProvisioning(adapter, request);
    const { error } = await db.rpc('confirm_contract_role_provisioning_atomic', {
      p_actor: internalUser.id,
      p_request: request.requestId,
      p_remote_auth: receipt.remoteAuthUserId,
      p_remote_company: receipt.remoteCompanyId,
      p_product_code: receipt.productCode,
      p_role_code: receipt.roleCode,
      p_revision: receipt.revision,
    });
    if (error) {
      await markForReconciliation();
      return { error: 'Perfil remoto confirmado, mas registro central requer reconciliação.' };
    }
    revalidatePath('/acessos/atribuicoes');
    revalidatePath('/acessos/provisionamento');
    return {
      error: null,
      success: 'Perfil confirmado no sistema de destino e registrado na auditoria.',
    };
  } catch {
    await markForReconciliation();
    return {
      error: 'Alteração não confirmada no produto. Não repita sem conciliar o estado remoto.',
    };
  }
}

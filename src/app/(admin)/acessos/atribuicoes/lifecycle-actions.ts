'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSupabaseProductProvisioningAdapter } from '@/lib/integrations/supabase-product-adapter';
import { verifyProductProvisioning } from '@/lib/integrations/product-provisioning-contract';
import type { SealedCredential } from '@/lib/integrations/supabase-connector';

export type RoleLifecycleState = { error: string | null; success?: string };
const uuid = z.string().uuid();
const instruction = z.object({
  requestId: uuid,
  centralIdentityId: uuid,
  remoteAuthUserId: uuid,
  companyId: uuid,
  remoteCompanyId: z.string().min(1).max(128),
  productCode: z.string().min(1).max(128),
  roleCode: z.string().min(1).max(128),
  action: z.literal('REVOKE'),
});

/**
 * A central SUSPENDED state is committed before the remote revoke call.
 * If that call fails, do NOT reactivate automatically: keep reconciliation pending.
 * Seats are retained until every grant has been removed and independently verified.
 */
export async function revokeContractRole(
  _previous: RoleLifecycleState,
  form: FormData,
): Promise<RoleLifecycleState> {
  const { internalUser } = await requirePermission('users.access.manage');
  if (process.env.SERVICE_PRODUCT_PROFILE_PROVISIONING_ENABLED !== 'true')
    return { error: 'Revogação de perfis desabilitada até homologação do destino.' };

  const parsed = z.object({
    assignmentId: uuid,
    targetStatus: z.enum(['SUSPENDED','REVOKED']),
    reason: z.string().trim().min(5).max(500),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Informe atribuição, situação e motivo válido.' };

  const db = createAdminClient() as unknown as SupabaseClient;
  const { data: prepared, error: preparationError } =
    await db.rpc('prepare_contract_role_revocation_atomic', {
      p_actor: internalUser.id,
      p_assignment: parsed.data.assignmentId,
      p_target_status: parsed.data.targetStatus,
      p_reason: parsed.data.reason,
    });
  if (preparationError) return { error: 'A atribuição não está elegível para revogação.' };

  const request = instruction.safeParse(prepared);
  if (!request.success)
    return { error: 'Bloqueio central iniciado. Resposta inválida, exige reconciliação.' };
  const payload = request.data;

  async function reconcile(): Promise<boolean> {
    const { error } = await db.rpc('mark_provisioning_reconciliation_atomic', {
      p_actor: internalUser.id,
      p_request: payload.requestId,
      p_reason: 'DESTINATION_PROFILE_UNVERIFIED',
    });
    return !error;
  }

  const { data: assignment } = await db.from('contract_role_assignments')
    .select('environment_id').eq('id',parsed.data.assignmentId).single();
  if (!assignment) {
    await reconcile();
    return { error: 'Bloqueio central aplicado, mas a instalação precisa ser conciliada.' };
  }
  const { data: connection } = await db.from('environment_connections')
    .select('project_url,encrypted_admin_key,status')
    .eq('environment_id',assignment.environment_id).single();
  if (!connection || connection.status !== 'VERIFIED') {
    await reconcile();
    return { error: 'Bloqueio central aplicado. Conexão remota indisponível, exige reconciliação.' };
  }

  try {
    const adapter = createSupabaseProductProvisioningAdapter(
      connection.project_url, connection.encrypted_admin_key as SealedCredential,
    );
    const result = await verifyProductProvisioning(adapter, payload);
    const { error } = await db.rpc('confirm_contract_role_revocation_atomic', {
      p_actor: internalUser.id,
      p_request: payload.requestId,
      p_remote_auth: result.remoteAuthUserId,
      p_remote_company: result.remoteCompanyId,
      p_product_code: result.productCode,
      p_revision: result.revision,
    });
    if (error) {
      await reconcile();
      return { error: 'Bloqueio remoto confirmado, mas central exige reconciliação.' };
    }
    revalidatePath('/acessos/atribuicoes');
    revalidatePath('/acessos/provisionamento');
    return {
      error: null,
      success: parsed.data.targetStatus === 'REVOKED'
        ? 'Revogação confirmada no sistema de destino. Reserva de licença preservada até conciliação.'
        : 'Suspensão confirmada no destino. Licença permanece reservada.',
    };
  } catch {
    await reconcile();
    return { error: 'Bloqueio central aplicado, mas resultado remoto incerto. Exige reconciliação antes de repetir.' };
  }
}

export async function reactivateContractRole(
  _previous: RoleLifecycleState,
  form: FormData,
): Promise<RoleLifecycleState> {
  const { internalUser } = await requirePermission('users.access.manage');
  if (process.env.SERVICE_PRODUCT_PROFILE_PROVISIONING_ENABLED !== 'true')
    return { error: 'Reativação desabilitada até homologação do produto.' };
  const parsed = uuid.safeParse(String(form.get('assignmentId') ?? ''));
  if (!parsed.success) return { error: 'Atribuição inválida.' };
  const db = createAdminClient() as unknown as SupabaseClient;
  const { error } = await db.rpc('request_contract_role_reactivation_atomic', {
    p_actor: internalUser.id,
    p_assignment: parsed.data,
  });
  if (error) return { error: 'Reativação recusada. Verifique bloqueio anterior, licença e autorização.' };
  revalidatePath('/acessos/atribuicoes');
  return { error: null, success: 'Reativação solicitada. O acesso ficará pendente até confirmação no produto.' };
}

/**
 * Turns a successfully remote-suspended access into permanent revocation.
 * No second remote operation is issued and the named seat is not freed here.
 */
export async function finalizeSuspendedRoleRevocation(
  _previous: RoleLifecycleState,
  form: FormData,
): Promise<RoleLifecycleState> {
  const { internalUser } = await requirePermission('users.access.manage');
  if (process.env.SERVICE_PRODUCT_PROFILE_PROVISIONING_ENABLED !== 'true')
    return { error: 'Finalização desabilitada até homologação dos perfis de destino.' };
  const parsed = z.object({
    assignmentId: uuid,
    reason: z.string().trim().min(5).max(500),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Atribuição ou justificativa inválida.' };
  const db = createAdminClient() as unknown as SupabaseClient;
  const { error } = await db.rpc('finalize_suspended_contract_role_atomic', {
    p_actor: internalUser.id,
    p_assignment: parsed.data.assignmentId,
    p_reason: parsed.data.reason,
  });
  if (error) return {
    error: 'Revogação definitiva recusada. Verifique confirmação remota e operações pendentes.',
  };
  revalidatePath('/acessos/atribuicoes');
  return { error: null, success: 'Acesso revogado definitivamente, com licença preservada até conciliação.' };
}

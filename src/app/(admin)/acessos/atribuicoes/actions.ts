'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export type RoleAssignmentFormState = { error: string | null; success?: string };
const schema = z.object({
  contractId: z.string().uuid(),
  identityId: z.string().uuid(),
  companyId: z.string().uuid(),
  productId: z.string().uuid(),
  environmentId: z.string().uuid(),
  roleId: z.string().uuid(),
});

/**
 * New role assignments are recorded PENDING, never ACTIVE, until the product
 * adapter confirms its effective profile through an authenticated readback.
 */
export async function requestContractRoleAssignment(
  _previous: RoleAssignmentFormState,
  form: FormData,
): Promise<RoleAssignmentFormState> {
  const { internalUser } = await requirePermission('users.access.manage');
  const input = schema.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: 'Selecione contrato, usuário, empresa, produto, ambiente e perfil válidos.' };
  const db = createAdminClient() as unknown as SupabaseClient;
  const { data, error } = await db.rpc('assign_contract_role_atomic', {
    p_actor: internalUser.id,
    p_contract: input.data.contractId,
    p_identity: input.data.identityId,
    p_company: input.data.companyId,
    p_product: input.data.productId,
    p_environment: input.data.environmentId,
    p_role: input.data.roleId,
  });
  if (error || typeof data !== 'string') {
    return {
      error: 'Atribuição recusada. Verifique a vigência do contrato, licença, vínculo, perfil e ambiente. O controle nominal precisa estar homologado.',
    };
  }
  revalidatePath('/acessos/atribuicoes');
  revalidatePath('/acessos');
  return { error: null, success: 'Solicitação registrada como pendente. O perfil só será efetivo após confirmação no produto.' };
}

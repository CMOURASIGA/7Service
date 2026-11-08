'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
type FormState = { error: string | null; success?: string };
const poolSchema = z.object({
  contractId: z.string().uuid(),
  licenseLimit: z.coerce.number().int().min(0).max(100000),
  groupId: z.union([z.literal(''), z.string().uuid()]),
});
const entitlementSchema = z.object({
  contractId: z.string().uuid(),
  productId: z.string().uuid(),
});

export async function configureContractSeats(
  _previous: FormState, form: FormData,
): Promise<FormState> {
  const { internalUser } = await requirePermission('contracts.manage');
  const parsed = poolSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Contrato, grupo ou limite de licenças inválido.' };
  const db = createAdminClient() as unknown as SupabaseClient;
  const { error } = await db.rpc('configure_contract_named_seats_atomic', {
    p_actor: internalUser.id, p_contract: parsed.data.contractId,
    p_license_limit: parsed.data.licenseLimit, p_group: parsed.data.groupId || null,
  });
  if (error) return { error: 'Não foi possível configurar as licenças. Confira contrato, grupo e migração.' };
  revalidatePath('/clientes/licencas');
  return { error: null, success: 'Licenças configuradas em modo de conferência, sem alterar acessos ativos.' };
}

export async function authorizeContractProduct(
  _previous: FormState, form: FormData,
): Promise<FormState> {
  const { internalUser } = await requirePermission('contracts.manage');
  const parsed = entitlementSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Informe contrato e produto válidos.' };
  const db = createAdminClient() as unknown as SupabaseClient;
  const { error } = await db.rpc('enable_contract_product_atomic', {
    p_actor: internalUser.id,
    p_contract: parsed.data.contractId,
    p_product: parsed.data.productId,
  });
  if (error) return { error: 'Falha ao autorizar produto. Configure as licenças do contrato primeiro.' };
  revalidatePath('/clientes/licencas');
  return { error: null, success: 'Produto vinculado ao contrato com auditoria.' };
}

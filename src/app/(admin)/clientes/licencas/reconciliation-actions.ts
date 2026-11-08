'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export type ContractReconciliationResult = {
  error: string | null;
  summary?: {
    legacyUsers: number;
    occupied: number;
    limit: number;
    missingSeats: number;
    missingProducts: number;
    outsideCompanies: number;
    ready: boolean;
  };
  success?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function reconcileContractSeats(
  _previous: ContractReconciliationResult,
  form: FormData,
): Promise<ContractReconciliationResult> {
  const { internalUser } = await requirePermission('contracts.manage');
  const contractId = String(form.get('contractId') ?? '');
  if (!UUID.test(contractId)) return { error: 'Contrato inválido.' };
  const db = createAdminClient() as unknown as SupabaseClient;
  const { data, error } = await db.rpc('reconcile_contract_named_seats_atomic', {
    p_actor: internalUser.id,
    p_contract: contractId,
  });
  if (error || !data || typeof data !== 'object' || Array.isArray(data))
    return { error: 'Não foi possível conciliar as licenças. Verifique o contrato e as migrações.' };

  const value = data as Record<string, unknown>;
  const number = (key: string) => Number(value[key] ?? 0);
  revalidatePath('/clientes/licencas');
  return {
    error: null,
    summary: {
      legacyUsers: number('legacy_users'),
      occupied: number('occupied'),
      limit: number('limit'),
      missingSeats: number('missing_seats'),
      missingProducts: number('missing_products'),
      outsideCompanies: number('companies_outside_contract'),
      ready: value.ready === true,
    },
  };
}

/**
 * Controlled cutover. Never enabled by default. Migration report and destination
 * adapter E2E must have been approved before enabling the runtime flag.
 */
export async function activateContractSeats(
  _previous: ContractReconciliationResult,
  form: FormData,
): Promise<ContractReconciliationResult> {
  const { internalUser } = await requirePermission('contracts.manage');
  if (process.env.SERVICE_NAMED_SEATS_CUTOVER_ENABLED !== 'true')
    return { error: 'Ativação bloqueada. É necessário concluir a homologação da integração.' };
  const contractId = String(form.get('contractId') ?? '');
  const confirmation = String(form.get('confirmation') ?? '');
  if (!UUID.test(contractId) || confirmation !== 'ATIVAR LICENCAS')
    return { error: 'Contrato ou confirmação inválida.' };
  const db = createAdminClient() as unknown as SupabaseClient;
  const { error } = await db.rpc('activate_contract_named_seats_atomic', {
    p_actor: internalUser.id,
    p_contract: contractId,
  });
  if (error) return { error: 'Não foi possível ativar: existe divergência ou contrato inelegível.' };
  revalidatePath('/clientes/licencas');
  return { error: null, success: 'Controle nominal ativado para o contrato selecionado.' };
}

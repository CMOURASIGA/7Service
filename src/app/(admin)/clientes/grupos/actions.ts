'use server';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export type GroupFormState = { error: string | null; success?: string };
const group = z.object({ name: z.string().trim().min(3).max(160) });
const membership = z.object({ groupId: z.string().uuid(), clientId: z.string().uuid() });

export async function createCustomerGroup(
  _previous: GroupFormState,
  form: FormData,
): Promise<GroupFormState> {
  const { internalUser } = await requirePermission('clients.manage');
  const parsed = group.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Informe um nome de grupo válido.' };
  const extensionDb = createAdminClient() as unknown as SupabaseClient;
  const { data, error } = await extensionDb.rpc('create_customer_group_atomic', {
    p_actor: internalUser.id,
    p_name: parsed.data.name,
  });
  if (error || !data) return { error: 'Não foi possível criar o grupo. Verifique a migração.' };
  revalidatePath('/clientes/grupos');
  return { error: null, success: 'Grupo criado e auditado.' };
}

export async function addCompanyToGroup(
  _previous: GroupFormState,
  form: FormData,
): Promise<GroupFormState> {
  const { internalUser } = await requirePermission('clients.manage');
  const parsed = membership.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Selecione grupo e empresa válidos.' };
  const extensionDb = createAdminClient() as unknown as SupabaseClient;
  const { error } = await extensionDb.rpc('add_company_to_customer_group_atomic', {
    p_actor: internalUser.id,
    p_group: parsed.data.groupId,
    p_client: parsed.data.clientId,
  });
  if (error) return { error: 'Vínculo recusado. A empresa pode pertencer a outro grupo ativo.' };
  revalidatePath('/clientes/grupos');
  return { error: null, success: 'Empresa vinculada ao grupo com auditoria.' };
}

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

const deploymentInput = z.object({
  productId: z.string().uuid(),
  clientId: z.string().uuid(),
  name: z.string().trim().min(3).max(120),
});
const environmentInput = z.object({
  deploymentId: z.string().uuid(),
  environment: z.enum(['PRODUCTION', 'HOMOLOGATION', 'DEVELOPMENT', 'DEMO']),
  entryUrl: z.union([z.literal(''), z.string().url().startsWith('https://')]),
});

export type EnvironmentFormState = { error: string | null; success?: string };

export async function createDedicatedDeployment(
  _state: EnvironmentFormState,
  formData: FormData,
): Promise<EnvironmentFormState> {
  const { internalUser } = await requirePermission('clients.manage');
  const parsed = deploymentInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Informe cliente, produto e nome válidos.' };
  const { clientId, productId, name } = parsed.data;
  const { error } = await createAdminClient().rpc('create_dedicated_deployment_atomic', {
    p_actor_id: internalUser.id,
    p_client_id: clientId,
    p_product_id: productId,
    p_name: name,
  });
  if (error) return { error: error.message };
  revalidatePath('/ambientes');
  return {
    error: null,
    success:
      'Implantação dedicada cadastrada e auditada de forma atômica como planejada. Nenhum banco foi provisionado.',
  };
}

export async function registerEnvironment(
  _state: EnvironmentFormState,
  formData: FormData,
): Promise<EnvironmentFormState> {
  const { internalUser } = await requirePermission('clients.manage');
  const parsed = environmentInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: 'Dados inválidos: use um endereço HTTPS ou deixe a URL vazia.' };
  const { deploymentId, environment, entryUrl } = parsed.data;
  const { error } = await createAdminClient().rpc('register_product_environment_atomic', {
    p_actor_id: internalUser.id,
    p_deployment_id: deploymentId,
    p_environment: environment,
    p_entry_url: entryUrl || null,
  });
  if (error) return { error: error.message };
  revalidatePath('/ambientes');
  return {
    error: null,
    success: 'Ambiente cadastrado e auditado como planejado; nenhum recurso foi provisionado.',
  };
}

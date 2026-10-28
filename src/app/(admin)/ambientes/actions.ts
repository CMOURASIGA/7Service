'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

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
  await requirePermission('clients.manage');
  const parsed = deploymentInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Informe cliente, produto e nome válidos.' };

  const db = await createClient();
  const { clientId, productId, name } = parsed.data;
  const { data: client } = await db.from('clients').select('id').eq('id', clientId).maybeSingle();
  const { data: product } = await db
    .from('products')
    .select('id')
    .eq('id', productId)
    .maybeSingle();
  if (!client || !product) return { error: 'Cliente ou produto não encontrado.' };

  const { data: deployment, error: deploymentError } = await db
    .from('product_deployments')
    .insert({ product_id: productId, model: 'DEDICATED', name, status: 'PLANNED' })
    .select('id')
    .single();
  if (deploymentError || !deployment)
    return { error: deploymentError?.message ?? 'Falha ao criar implantação.' };

  const { error: associationError } = await db
    .from('client_deployments')
    .insert({ client_id: clientId, product_id: productId, deployment_id: deployment.id });
  if (associationError) {
    await db.from('product_deployments').delete().eq('id', deployment.id);
    return { error: associationError.message };
  }

  revalidatePath('/ambientes');
  return {
    error: null,
    success:
      'Implantação dedicada cadastrada como planejada. Nenhum banco foi provisionado automaticamente.',
  };
}

export async function registerEnvironment(
  _state: EnvironmentFormState,
  formData: FormData,
): Promise<EnvironmentFormState> {
  await requirePermission('clients.manage');
  const parsed = environmentInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { error: 'Dados inválidos: use um endereço HTTPS ou deixe a URL vazia.' };
  const db = await createClient();
  const { deploymentId, environment, entryUrl } = parsed.data;
  const { data: deployment } = await db
    .from('product_deployments')
    .select('id,model')
    .eq('id', deploymentId)
    .maybeSingle();
  if (!deployment) return { error: 'Implantação não encontrada.' };
  const { error } = await db.from('product_environments').insert({
    deployment_id: deploymentId,
    environment,
    entry_url: entryUrl || null,
    status: 'PLANNED',
  });
  if (error) return { error: error.message };
  revalidatePath('/ambientes');
  return {
    error: null,
    success:
      'Ambiente cadastrado como planejado. Não equivale a deploy, banco ativo ou acesso concedido.',
  };
}

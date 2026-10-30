import 'server-only';

import { AppError } from '@/lib/errors';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  validateProductEnvironment,
  type ProductEnvironmentInput,
} from '@/lib/environments/validation';

/**
 * Server-side operations only. Callers must enforce authenticated internal RBAC
 * and authorization for the requested deployment. The service role bypasses RLS.
 */
export async function listProductEnvironments(deploymentId: string) {
  const { data, error } = await createAdminClient()
    .from('product_environments')
    .select('id,deployment_id,environment,entry_url,status,database_resource_ref,version_sha,created_at')
    .eq('deployment_id', deploymentId)
    .order('environment');
  if (error) throw new AppError('UNEXPECTED_ERROR', 'Não foi possível consultar ambientes');
  return data ?? [];
}

export async function createProductEnvironment(deploymentId: string, input: ProductEnvironmentInput) {
  const normalized = validateProductEnvironment(input);
  const db = createAdminClient();
  const { data: existing, error: lookupError } = await db.from('product_environments')
    .select('id').eq('deployment_id', deploymentId).eq('environment', normalized.environment).limit(1);
  if (lookupError) throw new AppError('UNEXPECTED_ERROR', 'Não foi possível verificar o ambiente');
  if (existing?.length) throw new AppError('CONFLICT', 'Ambiente já cadastrado nesta implantação');

  const { data, error } = await db.from('product_environments').insert({
    deployment_id: deploymentId,
    environment: normalized.environment,
    entry_url: normalized.entryUrl ?? null,
    database_resource_ref: normalized.databaseResourceRef ?? null,
    version_sha: normalized.versionSha ?? null,
    status: 'ACTIVE',
  }).select('id,deployment_id,environment,entry_url,status,database_resource_ref,version_sha,created_at').single();
  if (error?.code === '23505') throw new AppError('CONFLICT', 'Ambiente já cadastrado nesta implantação');
  if (error || !data) throw new AppError('UNEXPECTED_ERROR', 'Não foi possível criar o ambiente');
  return data;
}

export async function updateProductEnvironment(id: string, input: ProductEnvironmentInput) {
  const normalized = validateProductEnvironment(input);
  const { data, error } = await createAdminClient().from('product_environments')
    .update({
      entry_url: normalized.entryUrl ?? null,
      database_resource_ref: normalized.databaseResourceRef ?? null,
      version_sha: normalized.versionSha ?? null,
    })
    .eq('id', id).eq('environment', normalized.environment)
    .select('id,deployment_id,environment,entry_url,status,database_resource_ref,version_sha,created_at').single();
  if (error || !data) throw new AppError('NOT_FOUND', 'Ambiente não encontrado ou tipo divergente');
  return data;
}

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export type VersionFormState = { error: string | null; success?: string };

const versionSchema = z.object({
  environmentId: z.string().uuid(),
  commitSha: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{40}$/),
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'ROLLED_BACK']),
  notes: z.string().trim().max(1000),
});

export async function recordDeploymentVersion(
  _previous: VersionFormState,
  formData: FormData,
): Promise<VersionFormState> {
  const { internalUser } = await requirePermission('clients.manage');
  const input = versionSchema.safeParse(Object.fromEntries(formData));
  if (!input.success)
    return {
      error: 'Informe ambiente, SHA completo de 40 caracteres, status e observações válidas.',
    };
  const { environmentId, commitSha, status, notes } = input.data;
  // Manual reports never activate infrastructure; production success requires verified integration.
  if (status === 'SUCCESS') {
    const db = createAdminClient();
    const { data: target, error: readError } = await db
      .from('product_environments')
      .select('environment')
      .eq('id', environmentId)
      .maybeSingle();
    if (readError || !target) return { error: 'Ambiente não encontrado.' };
    if (target.environment === 'PRODUCTION')
      return {
        error: 'Sucesso em produção exige comprovação da integração de deploy, não relato manual.',
      };
  }
  const { error } = await createAdminClient().rpc('record_deployment_version_atomic', {
    p_actor_id: internalUser.id,
    p_environment_id: environmentId,
    p_sha: commitSha,
    p_status: status,
    p_notes: notes,
  });
  if (error) return { error: error.message };
  revalidatePath('/ambientes');
  return {
    error: null,
    success:
      'Versão registrada como informação administrativa, sem alterar o estado operacional do ambiente.',
  };
}

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
  // A record of a report is NOT evidence of successful provisioning or deployment.
  // Human-entered reports cannot mark an environment ACTIVE or change its current SHA.
  const db = createAdminClient();
  const { data: environment, error: environmentError } = await db
    .from('product_environments')
    .select('id,deployment_id')
    .eq('id', environmentId)
    .maybeSingle();
  if (environmentError || !environment) return { error: 'Ambiente não encontrado.' };
  const { data: version, error } = await db
    .from('deployment_versions')
    .insert({
      environment_id: environmentId,
      commit_sha: commitSha.toLowerCase(),
      status,
      notes: notes || null,
      actor_id: internalUser.id,
    })
    .select('id')
    .single();
  if (error || !version)
    return { error: error?.message ?? 'Não foi possível registrar o histórico.' };
  const { error: auditError } = await db.from('audit_logs').insert({
    actor_internal_user_id: internalUser.id,
    action: 'deployment.version_reported',
    target_type: 'deployment_version',
    target_id: version.id,
    after_json: { commitSha: commitSha.toLowerCase(), reportedStatus: status },
    reason: notes || null,
    source: '7service',
  });
  if (auditError)
    return { error: 'Registro persistido, mas auditoria falhou. Requer conciliação.' };
  revalidatePath('/ambientes');
  return {
    error: null,
    success:
      'Versão registrada como informação administrativa, sem alterar o estado operacional do ambiente.',
  };
}

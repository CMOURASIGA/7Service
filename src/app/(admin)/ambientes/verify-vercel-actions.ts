'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  matchesVercelDeployment,
  type VercelDeploymentProof,
} from '@/lib/deployments/vercel-evidence';

type VerificationState = { error: string | null; success?: string };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export async function verifyVercelEvidence(
  _previous: VerificationState,
  form: FormData,
): Promise<VerificationState> {
  const { internalUser } = await requirePermission('clients.manage');
  const evidenceId = String(form.get('evidenceId') ?? '');
  if (!uuid.test(evidenceId)) return { error: 'Evidência inválida.' };
  const token = process.env.SEVENSERVICE_VERCEL_VERIFY_TOKEN ?? '';
  const projectId = process.env.SEVENSERVICE_VERCEL_VERIFY_PROJECT_ID ?? '';
  if (!token || !/^prj_[A-Za-z0-9]+$/.test(projectId))
    return { error: 'Verificação Vercel não configurada no servidor.' };
  const db = createAdminClient();
  const { data: evidence, error } = await db
    .from('deployment_evidence')
    .select('id,environment_id,commit_sha,provider,run_reference,verification_state')
    .eq('id', evidenceId)
    .maybeSingle();
  if (
    error ||
    !evidence ||
    evidence.provider !== 'VERCEL' ||
    evidence.verification_state !== 'UNVERIFIED'
  )
    return { error: 'Evidência não elegível.' };
  const deploymentId = evidence.run_reference;
  if (!/^dpl_[A-Za-z0-9]+$/.test(deploymentId))
    return { error: 'Informe o identificador real de deployment Vercel (dpl_...).' };
  const { data: environment, error: envError } = await db
    .from('product_environments')
    .select('environment,entry_url')
    .eq('id', evidence.environment_id)
    .maybeSingle();
  if (envError || !environment?.entry_url)
    return { error: 'O ambiente precisa ter URL HTTPS registrada para verificar o deployment.' };
  try {
    const response = await fetch(
      `https://api.vercel.com/v13/deployments/${encodeURIComponent(deploymentId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!response.ok) return { error: `Consulta Vercel não concluída (${response.status}).` };
    const deployment = (await response.json()) as VercelDeploymentProof;
    if (
      !matchesVercelDeployment({
        deployment,
        deploymentId,
        projectId,
        commitSha: evidence.commit_sha,
        environment: environment.environment,
        entryUrl: environment.entry_url,
      })
    )
      return { error: 'Deployment não corresponde ao projeto, SHA, ambiente ou URL cadastrados.' };
    const { error: verificationError } = await db.rpc('verify_vercel_deployment_evidence', {
      p_actor: internalUser.id,
      p_evidence: evidenceId,
      p_sha: evidence.commit_sha,
      p_deployment_id: deploymentId,
    });
    if (verificationError) return { error: verificationError.message };
    revalidatePath('/ambientes');
    return {
      error: null,
      success:
        'Deploy Vercel verificado por projeto, SHA, estado e URL. Ambiente não foi alterado.',
    };
  } catch {
    return { error: 'Falha na consulta ou na validação do deployment Vercel.' };
  }
}

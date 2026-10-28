'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

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
  const { data: evidence, error } = await db.from('deployment_evidence')
    .select('id,environment_id,commit_sha,provider,run_reference,verification_state')
    .eq('id', evidenceId).maybeSingle();
  if (error || !evidence || evidence.provider !== 'VERCEL' ||
      evidence.verification_state !== 'UNVERIFIED') return { error: 'Evidência não elegível.' };
  const deploymentId = evidence.run_reference;
  if (!/^dpl_[A-Za-z0-9]+$/.test(deploymentId))
    return { error: 'Informe o identificador real de deployment Vercel (dpl_...).' };
  const { data: environment, error: envError } = await db.from('product_environments')
    .select('environment,entry_url').eq('id', evidence.environment_id).maybeSingle();
  if (envError || !environment?.entry_url)
    return { error: 'O ambiente precisa ter URL HTTPS registrada para verificar o deployment.' };
  try {
    const expectedHost = new URL(environment.entry_url).hostname.toLowerCase();
    const response = await fetch(
      `https://api.vercel.com/v13/deployments/${encodeURIComponent(deploymentId)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(12000) },
    );
    if (!response.ok) return { error: `Consulta Vercel não concluída (${response.status}).` };
    const deployment = (await response.json()) as {
      id?: string; projectId?: string; readyState?: string; target?: string | null;
      url?: string; alias?: string[]; meta?: { githubCommitSha?: string };
    };
    if (deployment.id !== deploymentId || deployment.projectId !== projectId ||
        deployment.readyState !== 'READY' ||
        deployment.meta?.githubCommitSha?.toLowerCase() !== evidence.commit_sha)
      return { error: 'Deployment, projeto, estado ou SHA não correspondem à evidência.' };
    if (environment.environment === 'PRODUCTION' && deployment.target !== 'production')
      return { error: 'Deployment não corresponde ao alvo de produção.' };
    if (environment.environment !== 'PRODUCTION' && deployment.target === 'production')
      return { error: 'Um deployment de produção não comprova ambiente não produtivo.' };
    const knownHosts = [deployment.url, ...(deployment.alias ?? [])].filter(Boolean)
      .map(x => String(x).toLowerCase());
    if (!knownHosts.includes(expectedHost))
      return { error: 'URL do deployment não corresponde à URL cadastrada para o ambiente.' };
    const { error: verificationError } = await db.rpc('verify_vercel_deployment_evidence', {
      p_actor: internalUser.id, p_evidence: evidenceId,
      p_sha: evidence.commit_sha, p_deployment_id: deploymentId,
    });
    if (verificationError) return { error: verificationError.message };
    revalidatePath('/ambientes');
    return { error: null, success: 'Deploy Vercel verificado por projeto, SHA, estado e URL. Ambiente não foi alterado.' };
  } catch {
    return { error: 'Falha na consulta ou na validação do deployment Vercel.' };
  }
}

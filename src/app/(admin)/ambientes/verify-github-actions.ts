'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

type VerificationState = { error: string | null; success?: string };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

async function githubJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Falha na consulta ao GitHub (${response.status}).`);
  return (await response.json()) as T;
}

export async function verifyGithubEvidence(
  _previous: VerificationState,
  form: FormData,
): Promise<VerificationState> {
  const { internalUser } = await requirePermission('clients.manage');
  const evidenceId = String(form.get('evidenceId') ?? '');
  if (!uuid.test(evidenceId)) return { error: 'Evidência inválida.' };
  const repo = process.env.SEVENSERVICE_GITHUB_VERIFY_REPO ?? '';
  const token = process.env.SEVENSERVICE_GITHUB_VERIFY_TOKEN ?? '';
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo) || !token)
    return { error: 'A integração de verificação do GitHub ainda não está configurada.' };
  const db = createAdminClient();
  const { data: evidence, error: readError } = await db
    .from('deployment_evidence')
    .select('id,environment_id,commit_sha,provider,run_reference,verification_state')
    .eq('id', evidenceId)
    .maybeSingle();
  if (
    readError ||
    !evidence ||
    evidence.provider !== 'GITHUB_ACTIONS' ||
    evidence.verification_state !== 'UNVERIFIED'
  )
    return { error: 'Evidência não elegível.' };
  // A successful CI run alone NEVER establishes a deployed environment.
  const runId = evidence.run_reference;
  if (!/^[1-9][0-9]{4,19}$/.test(runId))
    return { error: 'O identificador deve ser o ID numérico da execução GitHub Actions.' };
  const { data: env, error: envError } = await db
    .from('product_environments')
    .select('environment,entry_url')
    .eq('id', evidence.environment_id)
    .maybeSingle();
  if (envError || !env) return { error: 'Ambiente não encontrado.' };
  try {
    const base = `https://api.github.com/repos/${repo}`;
    const run = await githubJson<{
      id: number;
      head_sha: string;
      status: string;
      conclusion: string | null;
    }>(`${base}/actions/runs/${runId}`, token);
    if (
      String(run.id) !== runId ||
      run.status !== 'completed' ||
      run.conclusion !== 'success' ||
      run.head_sha.toLowerCase() !== evidence.commit_sha
    )
      return { error: 'Execução não concluída com sucesso para o SHA informado.' };
    const deployments = await githubJson<Array<{ id: number; sha: string; environment: string }>>(
      `${base}/deployments?sha=${encodeURIComponent(evidence.commit_sha)}&per_page=100`,
      token,
    );
    const target = deployments.find(
      (d) =>
        d.sha.toLowerCase() === evidence.commit_sha &&
        d.environment.toUpperCase() === env.environment,
    );
    if (!target) return { error: 'Não há deployment GitHub correspondente ao ambiente e ao SHA.' };
    const statuses = await githubJson<Array<{ state: string; log_url: string | null }>>(
      `${base}/deployments/${target.id}/statuses?per_page=1`,
      token,
    );
    if (statuses[0]?.state !== 'success')
      return { error: 'O deployment não possui status final de sucesso confirmado pelo GitHub.' };
    // A successful workflow on the same commit is not proof that THIS workflow
    // deployed THIS environment. Require the deployment status to link directly
    // to the exact Actions run, otherwise fail closed.
    const expectedLogUrl = `https://github.com/${repo}/actions/runs/${runId}`;
    if (statuses[0]?.log_url !== expectedLogUrl)
      return { error: 'O status do deployment não comprova vínculo com esta execução GitHub Actions.' };
    // Do not update operational environment state or report deployment in production.
    const { error } = await db.rpc('verify_github_deployment_evidence', {
      p_actor: internalUser.id,
      p_evidence: evidenceId,
      p_expected_sha: evidence.commit_sha,
      p_run_id: runId,
    });
    if (error) return { error: error.message };
    revalidatePath('/ambientes');
    return {
      error: null,
      success:
        'Execução e deployment GitHub confirmados. O estado operacional do ambiente permanece inalterado.',
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Não foi possível verificar o GitHub.' };
  }
}

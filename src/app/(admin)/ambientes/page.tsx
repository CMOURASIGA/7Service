import { requirePermission } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentRegistry } from './registry';
import { VersionHistoryForm } from '@/features/environments/components/version-history-form';
import { EvidenceForm } from '@/features/environments/components/evidence-form';
import { GithubEvidenceReview } from '@/features/environments/components/github-evidence-review';
import { VercelEvidenceReview } from '@/features/environments/components/vercel-evidence-review';

export const dynamic = 'force-dynamic';
export default async function AmbientesPage() {
  await requirePermission('clients.view');
  const db = await createClient();
  const [environmentsResult, deploymentsResult, clientsResult, productsResult] = await Promise.all([
    db
      .from('product_environments')
      .select(
        'id, environment, status, entry_url, database_resource_ref, version_sha, product_deployments(name,model)',
      )
      .order('created_at', { ascending: false }),
    db
      .from('product_deployments')
      .select('id,name,model')
      .order('created_at', { ascending: false }),
    db.from('clients').select('id,legal_name').eq('status', 'ACTIVE').order('legal_name'),
    db.from('products').select('id,name').eq('status', 'ACTIVE').order('name'),
  ]);
  const evidenceResult = await db
    .from('deployment_evidence')
    .select('id,provider,run_reference,commit_sha,verification_state,environment_id')
    .order('recorded_at', { ascending: false })
    .limit(50);
  const errors = [
    environmentsResult.error,
    deploymentsResult.error,
    clientsResult.error,
    productsResult.error,
    evidenceResult.error,
  ].filter(Boolean);
  if (errors.length)
    return (
      <p role="alert">
        Não foi possível consultar os ambientes. {errors.map((x) => x?.message).join('; ')}
      </p>
    );
  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Ambientes</h1>
        <p className="text-muted text-sm">
          Banco por cliente, implantações e URLs. Um cadastro planejado não representa
          provisionamento.
        </p>
      </div>
      <EnvironmentRegistry
        clients={clientsResult.data ?? []}
        products={productsResult.data ?? []}
        deployments={deploymentsResult.data ?? []}
      />
      <VersionHistoryForm
        environments={(environmentsResult.data ?? []).map((e) => ({
          id: e.id,
          label: `${e.product_deployments?.name ?? 'Implantação'} / ${e.environment}`,
        }))}
      />
      <EvidenceForm
        environments={(environmentsResult.data ?? []).map((e) => ({
          id: e.id,
          label: `${e.product_deployments?.name ?? 'Implantação'} / ${e.environment}`,
        }))}
      />
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Evidências registradas</h2>
        <p className="text-muted text-xs">
          A verificação compara SHA, resultado de execução e deployment GitHub; não altera a
          situação do ambiente.
        </p>
        {(evidenceResult.data ?? []).map((ev) => (
          <div key={ev.id} className="rounded-lg border p-3 text-sm">
            <p>
              {ev.provider} · {ev.verification_state} · Execução {ev.run_reference}
            </p>
            <p className="text-muted text-xs">
              SHA: {ev.commit_sha} / Ambiente: {ev.environment_id}
            </p>
            {ev.provider === 'GITHUB_ACTIONS' && ev.verification_state === 'UNVERIFIED' ? (
              <GithubEvidenceReview evidenceId={ev.id} />
            ) : null}
            {ev.provider === 'VERCEL' && ev.verification_state === 'UNVERIFIED' ? (
              <VercelEvidenceReview evidenceId={ev.id} />
            ) : null}
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Ambientes registrados</h2>
        {environmentsResult.data?.length ? (
          <ul className="flex flex-col gap-3">
            {environmentsResult.data.map((x) => (
              <li className="rounded-lg border p-4" key={x.id}>
                <strong>{x.product_deployments?.name}</strong> - {x.environment} - {x.status}
                <p>Modelo: {x.product_deployments?.model}</p>
                <p>Versão: {x.version_sha ?? 'Não informada'}</p>
                <p>
                  Referência do banco:{' '}
                  {x.database_resource_ref ?? 'Não registrada / provisionamento não confirmado'}
                </p>
                <p>URL cadastrada: {x.entry_url ?? 'Não cadastrada'}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted text-sm">Nenhum ambiente cadastrado.</p>
        )}
      </section>
    </main>
  );
}

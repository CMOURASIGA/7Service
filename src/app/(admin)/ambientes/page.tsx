import Link from 'next/link';
import { requirePermission } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { EnvironmentRegistry } from './registry';
import { WorkspaceTabs } from '@/components/ui/workspace-tabs';
import { ExistingDeploymentCompanyForm } from './existing-deployment-company-form';
import { EnvironmentLifecycleControls } from './lifecycle-controls';
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
  const environmentOptions = (environmentsResult.data ?? []).map((e) => ({
    id: e.id,
    label: `${e.product_deployments?.name ?? 'Implantação'} / ${e.environment}`,
  }));
  return (
    <main className="flex min-w-0 flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Ambientes</h1>
        <p className="text-muted text-sm">
          Gestão de implantações, ambientes, versões e conexões.
          O cadastro planejado não representa provisionamento.
        </p>
      </div>
      <WorkspaceTabs label="Gestão de ambientes" tabs={[
        {
          id: 'implantacoes',
          label: 'Implantações',
          content: (
            <div className="grid gap-5 xl:grid-cols-3">
              <EnvironmentRegistry
                clients={clientsResult.data ?? []}
                products={productsResult.data ?? []}
                deployments={deploymentsResult.data ?? []}
              />
              <ExistingDeploymentCompanyForm
                deployments={deploymentsResult.data ?? []}
                clients={clientsResult.data ?? []}
              />
            </div>
          ),
        },
        {
          id: 'ambientes',
          label: 'Ambientes registrados',
          content: (
            <section className="space-y-3">
              <h2 className="font-semibold">Ambientes registrados</h2>
              {environmentsResult.data?.length ? (
                <ul className="grid gap-3 lg:grid-cols-2">
                  {environmentsResult.data.map((x) => (
                    <li className="rounded-lg border p-4 text-sm" key={x.id}>
                      <strong>{x.product_deployments?.name}</strong> / {x.environment} / {x.status}
                      <p>Modelo: {x.product_deployments?.model}</p>
                      <p>Versão: {x.version_sha ?? 'Não informada'}</p>
                      <p>Referência do banco: {x.database_resource_ref ?? 'Não registrada'}</p>
                      <p className="break-all">URL: {x.entry_url ?? 'Não cadastrada'}</p>
                      <EnvironmentLifecycleControls environment={x} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted text-sm">Nenhum ambiente cadastrado.</p>
              )}
            </section>
          ),
        },
        {
          id: 'evidencias',
          label: 'Versões e evidências',
          content: (
            <div className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <VersionHistoryForm environments={environmentOptions} />
                <EvidenceForm environments={environmentOptions} />
              </div>
              <section className="space-y-3">
                <h2 className="font-semibold">Evidências registradas</h2>
                <p className="text-muted text-xs">
                  A verificação compara SHA, resultado de execução e deployment; não
                  altera a situação do ambiente.
                </p>
                {evidenceResult.data?.length ? (
                  <ul className="grid gap-3 lg:grid-cols-2">
                    {evidenceResult.data.map((ev) => (
                      <li key={ev.id} className="rounded-lg border p-4 text-sm">
                        <p>{ev.provider} / {ev.verification_state} / Execução {ev.run_reference}</p>
                        <p className="text-muted break-all text-xs">
                          SHA: {ev.commit_sha} / Ambiente: {ev.environment_id}
                        </p>
                        {ev.provider === 'GITHUB_ACTIONS' && ev.verification_state === 'UNVERIFIED' ? (
                          <GithubEvidenceReview evidenceId={ev.id} />
                        ) : null}
                        {ev.provider === 'VERCEL' && ev.verification_state === 'UNVERIFIED' ? (
                          <VercelEvidenceReview evidenceId={ev.id} />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted text-sm">Nenhuma evidência registrada.</p>
                )}
              </section>
            </div>
          ),
        },
        {
          id: 'conexoes',
          label: 'Conexões Supabase',
          content: (
            <section className="max-w-3xl space-y-3 rounded-lg border p-5">
              <h2 className="font-semibold">Conexões com projetos existentes</h2>
              <p className="text-muted text-sm">
                A configuração e a validação de credenciais acontecem em uma
                página administrativa protegida. Nenhum banco novo é criado.
              </p>
              <Link href="/ambientes/conexoes"
                className="inline-flex min-h-10 items-center rounded-md border border-blue-800
                  bg-white px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">
                Gerenciar conexões Supabase
              </Link>
            </section>
          ),
        },
      ]} />
    </main>
  );
}

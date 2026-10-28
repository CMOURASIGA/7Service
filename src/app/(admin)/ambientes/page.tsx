import { requirePermission } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export default async function AmbientesPage() {
  await requirePermission('clients.view');
  const db = await createClient();
  const [environmentsResult, deploymentsResult, clientsResult, productsResult] = await Promise.all([
    db
      .from('product_environments')
      .select('id, environment, status, entry_url, version_sha, product_deployments(name,model)')
      .order('created_at', { ascending: false }),
    db
      .from('product_deployments')
      .select('id,name,model')
      .order('created_at', { ascending: false }),
    db.from('clients').select('id,legal_name').eq('status', 'ACTIVE').order('legal_name'),
    db.from('products').select('id,name').eq('status', 'ACTIVE').order('name'),
  ]);
  const errors = [
    environmentsResult.error,
    deploymentsResult.error,
    clientsResult.error,
    productsResult.error,
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
      <p className="text-muted text-sm">
        Cadastros disponiveis: {clientsResult.data?.length ?? 0} clientes,{' '}
        {productsResult.data?.length ?? 0} produtos e {deploymentsResult.data?.length ?? 0}{' '}
        implantacoes.
      </p>
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Ambientes registrados</h2>
        {environmentsResult.data?.length ? (
          <ul className="flex flex-col gap-3">
            {environmentsResult.data.map((x) => (
              <li className="rounded-lg border p-4" key={x.id}>
                <strong>{x.product_deployments?.name}</strong> - {x.environment} - {x.status}
                <p>Modelo: {x.product_deployments?.model}</p>
                <p>Versão: {x.version_sha ?? 'Não informada'}</p>
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

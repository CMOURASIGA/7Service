import { requirePermission } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AmbientesPage() {
  await requirePermission('clients.view');
  const supabase = await createClient();
  const { data, error } = await supabase.from('product_environments')
    .select('id, environment, status, entry_url, version_sha, product_deployments(name,model)')
    .order('created_at', { ascending: false });
  if (error) return <p role="alert">Falha ao consultar ambientes: {error.message}</p>;
  return <main className="flex flex-col gap-4">
    <h1 className="text-xl font-semibold">Ambientes</h1>
    <p>Instancias de producao, homologacao, desenvolvimento e demonstracao.</p>
    {data?.length ? <ul className="flex flex-col gap-3">{data.map(x =>
      <li className="rounded-lg border p-4" key={x.id}>
        <strong>{x.product_deployments?.name}</strong> - {x.environment} - {x.status}
        <p>Modelo: {x.product_deployments?.model}</p>
        <p>Versao: {x.version_sha ?? 'Nao informada'}</p>
        <p>URL cadastrada: {x.entry_url ?? 'Nao cadastrada'}</p>
      </li>
    )}</ul> : <p>Nenhum ambiente cadastrado.</p>}
  </main>;
}

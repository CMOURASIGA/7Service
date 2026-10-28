import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ClientEnvironmentsPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('clients.view');
  const { id } = await params;
  const db = await createClient();
  const { data: client, error: clientError } = await db.from('clients')
    .select('id,legal_name,trade_name').eq('id', id).maybeSingle();
  if (clientError) throw new Error('Erro ao consultar cliente');
  if (!client) notFound();

  const { data: assignments, error: assignmentsError } = await db.from('client_deployments')
    .select('id,deployment_id,product_deployments(name,model,products(name))')
    .eq('client_id', id);
  if (assignmentsError) throw new Error('Erro ao consultar implantacoes do cliente');

  const deploymentIds = [...new Set((assignments ?? []).map(item => item.deployment_id))];
  const environments = deploymentIds.length
    ? await db.from('product_environments')
        .select('id,deployment_id,environment,entry_url,status,version_sha,database_resource_ref')
        .in('deployment_id', deploymentIds).order('environment')
    : { data: [], error: null };
  if (environments.error) throw new Error('Erro ao consultar ambientes');

  return <main className="flex flex-col gap-5">
    <nav className="text-sm"><Link className="text-brand-700 underline" href="/clientes">Clientes</Link> / {client.trade_name || client.legal_name} / Ambientes</nav>
    <div><h1 className="text-xl font-semibold">Ambientes de {client.trade_name || client.legal_name}</h1>
      <p className="text-muted text-sm">Inventario de bancos dedicados, implantacoes e versoes. Registrar URL nao concede acesso.</p></div>
    {!environments.data?.length ? <div className="rounded-lg border border-dashed p-6">Nenhum ambiente associado a este cliente.</div> :
      <ul className="flex flex-col gap-3">{environments.data.map(item => {
        const assignment = assignments?.find(a => a.deployment_id === item.deployment_id);
        return <li key={item.id} className="rounded-lg border p-4">
          <h2 className="font-semibold">{assignment?.product_deployments?.products?.name ?? 'Produto'} - {item.environment}</h2>
          <p className="text-sm">Implantacao: {assignment?.product_deployments?.name ?? '-'}</p>
          <p className="text-sm">Modelo: {assignment?.product_deployments?.model ?? '-'}</p>
          <p className="text-sm">Status: {item.status}</p>
          <p className="text-sm">Versao: {item.version_sha ?? 'Nao informada'}</p>
          <p className="text-sm">Banco: {item.database_resource_ref ? 'Referencia cadastrada' : 'Nao cadastrado'}</p>
          <p className="break-all text-sm">URL: {item.entry_url ?? 'Nao cadastrada'}</p>
        </li>;
      })}</ul>}
  </main>;
}

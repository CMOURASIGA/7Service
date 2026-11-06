import Link from 'next/link';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { IncidentForm } from '@/features/support/components/incident-form';
import { IncidentActions } from '@/features/support/components/incident-actions';

export const dynamic = 'force-dynamic';
export default async function SupportPage({ searchParams }: { searchParams: Promise<{ historico?: string }> }) {
  const showHistory = (await searchParams).historico === '1';
  await requirePermission('support.view');
  let canManage = false;
  try {
    await requirePermission('support.manage');
    canManage = true;
  } catch {
    canManage = false;
  }
  const db = createAdminClient();
  const [incidents, clients, products, environments] = await Promise.all([
    db
      .from('support_incidents')
      .select('id,title,severity,status,created_at,client_id,product_id')
      .order('created_at', { ascending: false })
      .limit(200),
    db
      .from('clients')
      .select('id,legal_name,trade_name')
      .eq('status', 'ACTIVE')
      .order('legal_name'),
    db.from('products').select('id,name').eq('status', 'ACTIVE').order('name'),
    db.from('product_environments').select('id,environment').order('environment'),
  ]);
  if (incidents.error || clients.error || products.error || environments.error)
    throw new Error('Falha ao consultar dados de suporte.');
  const activeClientIds = new Set((clients.data ?? []).map(c => c.id));
  const visibleIncidents = (incidents.data ?? []).filter(i => showHistory || activeClientIds.has(i.client_id));
  return (
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Suporte operacional</h1>
        <p className="text-muted text-sm">
          Incidentes por cliente, produto e ambiente, com auditoria.
        </p>
      </div>
      {canManage ? (
        <IncidentForm
          clients={(clients.data ?? []).map((c) => ({
            id: c.id,
            label: c.trade_name || c.legal_name,
          }))}
          products={(products.data ?? []).map((p) => ({ id: p.id, label: p.name }))}
          environments={(environments.data ?? []).map((e) => ({ id: e.id, label: e.environment }))}
        />
      ) : null}
      <Link className="text-brand-700 text-sm underline" href={showHistory ? '/suporte' : '/suporte?historico=1'}>{showHistory ? 'Ocultar incidentes históricos' : 'Consultar histórico de incidentes'}</Link>
      <section className="rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">Incidentes registrados</h2>
        {!visibleIncidents.length ? (
          <p className="text-muted text-sm">Nenhum incidente cadastrado.</p>
        ) : (
          <ul className="space-y-3">
            {visibleIncidents.map((i) => (
              <li key={i.id} className="rounded border p-4">
                <h3 className="font-medium">{i.title}</h3>
                <p className="text-muted text-sm">Cliente: {i.client_id}</p>
                <p className="text-muted text-sm">
                  Status: {i.status} · Severidade: {i.severity}
                </p>
                <p className="text-muted text-xs">
                  {new Date(i.created_at).toLocaleString('pt-BR')}
                </p>
                {canManage ? <IncidentActions id={i.id} status={i.status} /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

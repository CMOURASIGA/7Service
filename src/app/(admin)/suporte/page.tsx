import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { IncidentForm } from '@/features/support/components/incident-form';

export const dynamic='force-dynamic';
export default async function SupportPage(){
  await requirePermission('support.view');
  let canManage=false;
  try {await requirePermission('support.manage');canManage=true;}catch{canManage=false;}
  const db=createAdminClient();
  const [incidents,clients,products,environments]=await Promise.all([
    db.from('support_incidents').select('id,title,severity,status,created_at,client_id,product_id').order('created_at',{ascending:false}).limit(200),
    db.from('clients').select('id,legal_name,trade_name').eq('status','ACTIVE').order('legal_name'),
    db.from('products').select('id,name').order('name'),
    db.from('product_environments').select('id,environment').order('environment'),
  ]);
  if(incidents.error||clients.error||products.error||environments.error)
    throw new Error('Falha ao consultar dados de suporte.');
  return <main className="flex flex-col gap-5">
    <div><h1 className="text-xl font-semibold">Suporte operacional</h1>
      <p className="text-muted text-sm">Incidentes por cliente, produto e ambiente, com auditoria.</p></div>
    {canManage?<IncidentForm
      clients={(clients.data??[]).map(c=>({id:c.id,label:c.trade_name||c.legal_name}))}
      products={(products.data??[]).map(p=>({id:p.id,label:p.name}))}
      environments={(environments.data??[]).map(e=>({id:e.id,label:e.environment}))}
    />:null}
    <section className="rounded-lg border p-4"><h2 className="mb-3 font-semibold">Incidentes registrados</h2>
      {!incidents.data?.length?<p className="text-muted text-sm">Nenhum incidente cadastrado.</p>:
        <ul className="space-y-3">{incidents.data.map(i=><li key={i.id} className="rounded border p-4">
          <h3 className="font-medium">{i.title}</h3>
          <p className="text-muted text-sm">Cliente: {i.client_id}</p>
          <p className="text-muted text-sm">Status: {i.status} · Severidade: {i.severity}</p>
          <p className="text-muted text-xs">{new Date(i.created_at).toLocaleString('pt-BR')}</p>
        </li>)}</ul>}
    </section>
  </main>;
}

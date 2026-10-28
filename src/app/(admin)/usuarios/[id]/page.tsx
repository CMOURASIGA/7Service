import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { StatusBadge } from '@/components/ui/status-badge';
import { IDENTITY_STATUS_LABEL, ACCESS_STATUS_LABEL } from '@/lib/status-labels';
import { suspendAccessAction,reactivateAccessAction,revokeAccessAction,initiateRecoveryAction } from './actions';

export const dynamic='force-dynamic';
export default async function IdentityDetailPage({params}:{params:Promise<{id:string}>}){
  await requirePermission('users.manage');
  const {id}=await params;
  const db=createAdminClient();
  const [identity,memberships,accesses] = await Promise.all([
    db.from('identities').select('id,first_name,last_name,email,status').eq('id',id).maybeSingle(),
    db.from('client_memberships').select('id,client_id,status,clients(legal_name,trade_name)').eq('identity_id',id),
    db.from('user_product_access').select('id,client_id,status,subscription_id,subscriptions!user_product_access_subscription_id_fkey(products(name))').eq('identity_id',id),
  ]);
  if(identity.error||memberships.error||accesses.error) throw new Error('Falha ao carregar identidade.');
  if(!identity.data) notFound();
  const user=identity.data;
  const badge=IDENTITY_STATUS_LABEL[user.status as keyof typeof IDENTITY_STATUS_LABEL];
  return <main className="flex flex-col gap-5">
    <div><Link href="/usuarios" className="text-brand-700 text-sm underline">Usuarios</Link>
      <h1 className="text-xl font-semibold">{user.first_name} {user.last_name}</h1>
      <p className="text-muted text-sm">{user.email}</p><StatusBadge label={badge.label} tone={badge.tone}/>
      <div className="mt-3"><ConfirmAction triggerLabel="Solicitar recuperacao de acesso"
        action={initiateRecoveryAction.bind(null,id)}
        impactMessage="Envia um e-mail de recuperacao pelo Supabase Auth ao usuario cadastrado."
        confirmLabel="Enviar recuperacao"/></div></div>
    <section className="rounded-lg border p-5"><h2 className="mb-3 font-semibold">Empresas vinculadas</h2>
      {memberships.data?.length ? <ul>{memberships.data.map(m=><li key={m.id} className="border-b p-2">
        <Link className="text-brand-700 underline" href={`/clientes/${m.client_id}`}>{m.clients?.trade_name||m.clients?.legal_name||m.client_id}</Link>
        <span className="ml-2 text-sm text-muted">{m.status}</span></li>)}</ul> : <p>Nenhum vinculo cadastrado.</p>}
    </section>
    <section className="rounded-lg border p-5"><h2 className="mb-3 font-semibold">Acessos aos produtos</h2>
      {accesses.data?.length ? <ul className="space-y-3">{accesses.data.map(a=>{
        const info=ACCESS_STATUS_LABEL[a.status as keyof typeof ACCESS_STATUS_LABEL];
        return <li key={a.id} className="rounded border p-3">
          <div className="mb-2 flex justify-between gap-2"><span>{a.subscriptions?.products?.name||a.subscription_id}</span>
          <StatusBadge label={info.label} tone={info.tone}/></div>
          <div className="flex flex-wrap gap-2">
            {a.status==='ACTIVE'?<ConfirmAction triggerLabel="Suspender" action={suspendAccessAction.bind(null,a.id,id)}
              impactMessage="Suspende acesso ao produto." requireReason tone="danger" confirmLabel="Suspender"/>:null}
            {a.status==='SUSPENDED'?<ConfirmAction triggerLabel="Reativar" action={reactivateAccessAction.bind(null,a.id,id)}
              impactMessage="Reativa acesso, sujeito a vigencia da assinatura." confirmLabel="Reativar"/>:null}
            {a.status!=='REVOKED'?<ConfirmAction triggerLabel="Revogar" action={revokeAccessAction.bind(null,a.id,id)}
              impactMessage="Revoga acesso ao produto." requireReason tone="danger" confirmLabel="Revogar"/>:null}
          </div>
        </li>})}</ul>:<p>Nenhum acesso registrado.</p>}
    </section>
  </main>;
}

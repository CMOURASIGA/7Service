import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { StatusBadge } from '@/components/ui/status-badge';
import { GrantAccessForm, type GrantableSubscription } from '@/features/access/components/grant-access-form';
import { EnvironmentGrantForm } from '@/features/access/components/environment-grant-form';
import { revokeEnvironmentAction } from './ambientes/actions';
import { setMembershipStatusAction } from './memberships/actions';
import type { Product, Subscription, ProductRole } from '@/types/domain';
import { IDENTITY_STATUS_LABEL, ACCESS_STATUS_LABEL } from '@/lib/status-labels';
import {
  suspendAccessAction,
  reactivateAccessAction,
  revokeAccessAction,
  initiateRecoveryAction,
  grantAccessAction,
} from './actions';

export const dynamic = 'force-dynamic';
export default async function IdentityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('users.manage');
  const { id } = await params;
  const db = createAdminClient();
  const [identity, memberships, accesses] = await Promise.all([
    db.from('identities').select('id,first_name,last_name,email,status').eq('id', id).maybeSingle(),
    db
      .from('client_memberships')
      .select('id,client_id,status,clients(legal_name,trade_name)')
      .eq('identity_id', id),
    db
      .from('user_product_access')
      .select(
        'id,client_id,status,subscription_id,subscriptions!user_product_access_subscription_id_fkey(product_id,products(name))',
      )
      .eq('identity_id', id),
  ]);
  if (identity.error || memberships.error || accesses.error)
    throw new Error('Falha ao carregar identidade.');
  if (!identity.data) notFound();
  const clientIds=(memberships.data??[]).filter(m=>m.status==='ACTIVE').map(m=>m.client_id);
  const candidateSubscriptions=clientIds.length
    ? await db.from('subscriptions')
        .select('id,client_id,contract_id,product_id,plan_id,start_date,end_date,grace_days,monthly_value,implementation_value,license_limit,status,created_at')
        .in('client_id',clientIds).eq('status','ACTIVE')
    : {data:[],error:null};
  if(candidateSubscriptions.error) throw new Error('Falha ao consultar assinaturas elegíveis');
  const productIds=[...new Set((candidateSubscriptions.data??[]).map(x=>x.product_id))];
  const [productsResult,rolesResult]=await Promise.all([
    productIds.length
      ? db.from('products').select('id,code,name,status,description,entry_url,login_url,logo_path,created_at').in('id',productIds)
      : Promise.resolve({data:[],error:null}),
    productIds.length
      ? db.from('product_roles').select('id,product_id,code,name,status').in('product_id',productIds).eq('status','ACTIVE')
      : Promise.resolve({data:[],error:null}),
  ]);
  if(productsResult.error||rolesResult.error) throw new Error('Falha ao consultar perfis dos produtos');
  const alreadyGranted=new Set((accesses.data??[]).map(x=>x.subscription_id));
  const productsById=new Map((productsResult.data??[]).map(x=>[x.id,x]));
  const grantOptions:GrantableSubscription[]=(candidateSubscriptions.data??[])
    .filter(x=>!alreadyGranted.has(x.id) && productsById.has(x.product_id))
    .map(x=>{
      const p=productsById.get(x.product_id)!;
      const product:Product={
        id:p.id,code:p.code,name:p.name,status:p.status as Product['status'],
        description:p.description,entryUrl:p.entry_url,loginUrl:p.login_url,
        logoPath:p.logo_path,createdAt:p.created_at,
        roles:(rolesResult.data??[]).filter(r=>r.product_id===p.id).map(r=>({
          id:r.id,productId:r.product_id,code:r.code,name:r.name,
          status:r.status as ProductRole['status'],
        })),
        modules:[],features:[],
      };
      const subscription:Subscription={
        id:x.id,clientId:x.client_id,contractId:x.contract_id,
        productId:x.product_id,planId:x.plan_id,startDate:x.start_date,
        endDate:x.end_date,graceDays:x.grace_days,
        monthlyValue:x.monthly_value,implementationValue:x.implementation_value,
        licenseLimit:x.license_limit,status:x.status as Subscription['status'],
        createdAt:x.created_at,
      };
      return {product,subscription};
    });
  const eligibleAccesses=(accesses.data??[]).filter(a=>a.status==='ACTIVE')
    .map(a=>({
      id:a.id,clientId:a.client_id,
      productId:a.subscriptions?.product_id??'',
      label:(a.subscriptions?.products?.name??'Produto')+' / '+a.client_id.slice(0,8),
    }));
  const links=clientIds.length ? await db.from('client_deployments')
    .select('deployment_id,client_id,product_id').in('client_id',clientIds)
    : {data:[],error:null};
  if(links.error) throw new Error('Falha ao consultar implantacoes');
  const deploymentIds=[...new Set((links.data??[]).map(l=>l.deployment_id))];
  const environmentsResult=deploymentIds.length ? await db.from('product_environments')
    .select('id,deployment_id,environment,status').in('deployment_id',deploymentIds).eq('status','ACTIVE')
    : {data:[],error:null};
  if(environmentsResult.error) throw new Error('Falha ao consultar ambientes');
  const environmentOptions=(environmentsResult.data??[]).flatMap(e=>
    (links.data??[]).filter(l=>l.deployment_id===e.deployment_id).map(l=>({
      id:e.id,clientId:l.client_id,productId:l.product_id,
      label:e.environment+' / '+l.client_id.slice(0,8),
    }))
  );
  const accessIds=(accesses.data??[]).map(a=>a.id);
  const environmentGrants=accessIds.length ? await db.from('environment_access')
    .select('id,access_id,environment_id,status,valid_until')
    .in('access_id',accessIds).eq('status','ACTIVE')
    : {data:[],error:null};
  if(environmentGrants.error) throw new Error('Falha ao consultar autorizacoes de ambiente');
  const user = identity.data;
  const badge = IDENTITY_STATUS_LABEL[user.status as keyof typeof IDENTITY_STATUS_LABEL];
  return (
    <main className="flex flex-col gap-5">
      <div>
        <Link href="/usuarios" className="text-brand-700 text-sm underline">
          Usuarios
        </Link>
        <h1 className="text-xl font-semibold">
          {user.first_name} {user.last_name}
        </h1>
        <p className="text-muted text-sm">{user.email}</p>
        <StatusBadge label={badge.label} tone={badge.tone} />
        <div className="mt-3">
          <ConfirmAction
            triggerLabel="Solicitar recuperacao de acesso"
            action={initiateRecoveryAction.bind(null, id)}
            impactMessage="Envia um e-mail de recuperacao pelo Supabase Auth ao usuario cadastrado."
            confirmLabel="Enviar recuperacao"
          />
        </div>
      </div>
      <section className="rounded-lg border p-5">
        <h2 className="mb-3 font-semibold">Empresas vinculadas</h2>
        {memberships.data?.length ? (
          <ul>
            {memberships.data.map((m) => (
              <li key={m.id} className="border-b p-2">
                <Link className="text-brand-700 underline" href={`/clientes/${m.client_id}`}>
                  {m.clients?.trade_name || m.clients?.legal_name || m.client_id}
                </Link>
                <span className="text-muted ml-2 text-sm">{m.status}</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.status==='ACTIVE'?<>
                    <ConfirmAction triggerLabel="Suspender nesta empresa"
                      impactMessage="Suspende apenas o vínculo com esta empresa, sem afetar outras empresas."
                      action={setMembershipStatusAction.bind(null,id,m.id,'SUSPENDED')}
                      requireReason tone="danger" confirmLabel="Suspender"/>
                    <ConfirmAction triggerLabel="Revogar vínculo"
                      impactMessage="Revoga os acessos desta empresa. Outras empresas não são afetadas."
                      action={setMembershipStatusAction.bind(null,id,m.id,'REVOKED')}
                      requireReason tone="danger" confirmLabel="Revogar"/>
                  </>:null}
                  {m.status==='SUSPENDED'?<ConfirmAction triggerLabel="Reativar nesta empresa"
                    impactMessage="Reativa apenas este vínculo empresarial."
                    action={setMembershipStatusAction.bind(null,id,m.id,'ACTIVE')} confirmLabel="Reativar"/>:null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhum vinculo cadastrado.</p>
        )}
      </section>
      <section className="rounded-lg border p-5">
        <h2 className="mb-3 font-semibold">Acessos aos produtos</h2>
        <GrantAccessForm action={grantAccessAction.bind(null,id)} options={grantOptions}/>
        {accesses.data?.length ? (
          <ul className="space-y-3">
            {accesses.data.map((a) => {
              const info = ACCESS_STATUS_LABEL[a.status as keyof typeof ACCESS_STATUS_LABEL];
              return (
                <li key={a.id} className="rounded border p-3">
                  <div className="mb-2 flex justify-between gap-2">
                    <span>{a.subscriptions?.products?.name || a.subscription_id}</span>
                    <StatusBadge label={info.label} tone={info.tone} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.status === 'ACTIVE' ? (
                      <ConfirmAction
                        triggerLabel="Suspender"
                        action={suspendAccessAction.bind(null, a.id, id)}
                        impactMessage="Suspende acesso ao produto."
                        requireReason
                        tone="danger"
                        confirmLabel="Suspender"
                      />
                    ) : null}
                    {(a.status === 'SUSPENDED' || (a.status === 'PENDING' && user.status === 'ACTIVE')) ? (
                      <ConfirmAction
                        triggerLabel={a.status === 'PENDING' ? 'Ativar acesso' : 'Reativar'}
                        action={reactivateAccessAction.bind(null, a.id, id)}
                        impactMessage="Reativa acesso, sujeito a vigencia da assinatura."
                        confirmLabel="Reativar"
                      />
                    ) : null}
                    {a.status !== 'REVOKED' ? (
                      <ConfirmAction
                        triggerLabel="Revogar"
                        action={revokeAccessAction.bind(null, a.id, id)}
                        impactMessage="Revoga acesso ao produto."
                        requireReason
                        tone="danger"
                        confirmLabel="Revogar"
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>Nenhum acesso registrado.</p>
        )}
      </section>
      <section className="rounded-lg border p-5">
        <h2 className="mb-3 font-semibold">Acessos por ambiente</h2>
        <EnvironmentGrantForm identityId={id} accesses={eligibleAccesses} environments={environmentOptions} />
        {(environmentGrants.data??[]).length ? <ul className="mt-4 space-y-2">
          {(environmentGrants.data??[]).map(g=><li key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm">
            <span>{environmentOptions.find(e=>e.id===g.environment_id)?.label??g.environment_id} / {g.valid_until?'Até '+new Date(g.valid_until).toLocaleDateString('pt-BR'):'Sem término cadastrado'}</span>
            <ConfirmAction triggerLabel="Revogar ambiente"
              impactMessage="Revoga o acesso exclusivo a este ambiente."
              action={revokeEnvironmentAction.bind(null,id,g.id)} tone="danger" confirmLabel="Revogar" />
          </li>)}
        </ul> : <p className="mt-3 text-sm text-muted">Nenhuma autorização de ambiente ativa.</p>}
      </section>
    </main>
  );
}

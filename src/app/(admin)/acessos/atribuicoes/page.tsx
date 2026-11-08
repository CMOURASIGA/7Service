import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { ContractRoleAssignmentForm } from './form';
import { PendingRoleProvisioningControl } from './provisioning-control';

export const dynamic = 'force-dynamic';
export default async function ContractRoleAssignmentsPage() {
  await requirePermission('users.access.manage');
  const db = createAdminClient() as unknown as SupabaseClient;
  const [contracts, people, companies, products, environments, roles, assignments] =
    await Promise.all([
      db.from('contracts').select('id,reference').eq('status','ACTIVE'),
      db.from('identities').select('id,first_name,last_name,email').in('status',['ACTIVE','PENDING_INVITE']),
      db.from('clients').select('id,legal_name,trade_name').eq('status','ACTIVE'),
      db.from('products').select('id,name').eq('status','ACTIVE'),
      db.from('product_environments').select('id,environment,deployment_id').eq('status','ACTIVE'),
      db.from('product_roles').select('id,code,name,product_id').eq('status','ACTIVE'),
      db.from('contract_role_assignments')
        .select('id,identity_id,company_id,product_id,environment_id,role_id,status,contract_id')
        .order('created_at',{ascending:false}).limit(100),
    ]);

  if ([contracts,people,companies,products,environments,roles,assignments]
    .some(result=>result.error)) {
    return (
      <main className="flex flex-col gap-4">
        <Link href="/acessos" className="text-sm text-brand-700 underline">Acessos</Link>
        <h1 className="text-xl font-semibold">Perfis por empresa e produto</h1>
        <p role="alert">O modelo contratual ainda não foi aplicado ou validado neste ambiente.</p>
      </main>
    );
  }
  const peopleMap = new Map((people.data ?? []).map(p=>[p.id,
    [p.first_name,p.last_name].filter(Boolean).join(' ') || p.email]));
  const companiesMap = new Map((companies.data ?? []).map(c=>[c.id,c.trade_name || c.legal_name]));
  const productMap = new Map((products.data ?? []).map(p=>[p.id,p.name]));
  const roleMap = new Map((roles.data ?? []).map(r=>[r.id,r.name]));

  return (
    <main className="flex flex-col gap-6">
      <div>
        <Link href="/acessos" className="text-sm text-brand-700 underline">Acessos</Link>
        <h1 className="text-xl font-semibold">Perfis por empresa e produto</h1>
        <p className="text-muted text-sm">
          Um único perfil efetivo por pessoa, empresa, sistema e instalação.
          O registro inicial é pendente até a confirmação remota.
        </p>
      </div>
      <ContractRoleAssignmentForm
        contracts={(contracts.data??[]).map(c=>({id:c.id,label:c.reference}))}
        identities={(people.data??[]).map(p=>({
          id:p.id,label:[p.first_name,p.last_name].filter(Boolean).join(' ') || p.email,
        }))}
        companies={(companies.data??[]).map(c=>({id:c.id,label:c.trade_name || c.legal_name}))}
        products={(products.data??[]).map(p=>({id:p.id,label:p.name}))}
        environments={(environments.data??[]).map(e=>({
          id:e.id,label:`${e.environment} / ${e.deployment_id.slice(0,8)}`,
        }))}
        roles={(roles.data??[]).map(r=>({
          id:r.id,label:`${productMap.get(r.product_id)??'Produto'} / ${r.name}`,
          productId:r.product_id,
        }))}
      />
      <section className="space-y-3">
        <h2 className="font-semibold">Atribuições registradas</h2>
        {!assignments.data?.length ? (
          <p className="text-muted text-sm">Nenhuma atribuição no novo modelo.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50">
                <tr>
                  <th className="p-3">Usuário</th>
                  <th className="p-3">Empresa</th>
                  <th className="p-3">Produto e perfil</th>
                  <th className="p-3">Situação</th>
                  <th className="p-3">Confirmação</th>
                </tr>
              </thead>
              <tbody>
                {(assignments.data??[]).map(a=>(
                  <tr key={a.id} className="border-b">
                    <td className="p-3">{peopleMap.get(a.identity_id)??a.identity_id}</td>
                    <td className="p-3">{companiesMap.get(a.company_id)??a.company_id}</td>
                    <td className="p-3">
                      {productMap.get(a.product_id)??a.product_id}
                      <p className="text-muted text-xs">{roleMap.get(a.role_id)??a.role_id}</p>
                    </td>
                    <td className="p-3">{a.status}</td>
                    <td className="p-3">
                      {process.env.SERVICE_PRODUCT_PROFILE_PROVISIONING_ENABLED === 'true' && a.status === 'PENDING' ? (
                        <PendingRoleProvisioningControl assignmentId={a.id}/>
                      ) : <span className="text-muted text-xs">Não habilitado</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

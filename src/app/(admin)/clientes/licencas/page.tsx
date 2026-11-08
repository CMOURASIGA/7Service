import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { ContractLicensingForms } from './forms';
import { ContractReconciliation } from './reconciliation-form';
export const dynamic = 'force-dynamic';
export default async function ContractLicensingPage() {
  await requirePermission('contracts.manage');
  const db = createAdminClient() as unknown as SupabaseClient;
  const [contracts, groups, products, pools, seats, entitlements] = await Promise.all([
    db.from('contracts').select('id,reference,client_id').order('created_at',{ ascending:false }),
    db.from('customer_groups').select('id,name').eq('status','ACTIVE').order('name'),
    db.from('products').select('id,name').eq('status','ACTIVE').order('name'),
    db.from('contract_seat_pools').select('contract_id,license_limit,enforcement_mode'),
    db.from('contract_named_seats').select('contract_id,identity_id,status'),
    db.from('contract_product_entitlements').select('contract_id,product_id'),
  ]);
  if ([contracts,groups,products,pools,seats,entitlements].some(x=>x.error)) return (
    <main className="flex flex-col gap-3">
      <Link href="/clientes" className="text-sm text-brand-700 underline">Clientes</Link>
      <h1 className="text-xl font-semibold">Licenciamento por contrato</h1>
      <p role="alert">Migrações de licenciamento ainda não aplicadas neste ambiente.</p>
    </main>
  );
  const productNames = new Map((products.data ?? []).map(p=>[p.id,p.name]));
  const contractsById = new Map((contracts.data ?? []).map(c=>[c.id,c.reference]));
  return (
    <main className="flex flex-col gap-6">
      <div>
        <Link href="/clientes" className="text-sm text-brand-700 underline">Clientes</Link>
        <h1 className="text-xl font-semibold">Licenciamento por contrato</h1>
        <p className="text-muted text-sm">
          Uma licença por identidade no contrato, independentemente dos produtos
          e empresas autorizados. A ativação do novo controle exige reconciliação.
        </p>
      </div>
      <ContractLicensingForms
        contracts={(contracts.data??[]).map(c=>({id:c.id,label:c.reference}))}
        groups={(groups.data??[]).map(g=>({id:g.id,label:g.name}))}
        products={(products.data??[]).map(p=>({id:p.id,label:p.name}))}
      />
      <ContractReconciliation
        contracts={(contracts.data??[]).map(c=>({id:c.id,label:c.reference}))}
        allowCutover={process.env.SERVICE_NAMED_SEATS_CUTOVER_ENABLED === 'true'}
      />
      <section className="space-y-3">
        <h2 className="font-semibold">Visão contratual</h2>
        {(pools.data??[]).map(pool=>{
          const used = new Set((seats.data??[])
            .filter(s=>s.contract_id===pool.contract_id && s.status!=='RELEASED')
            .map(s=>s.identity_id)).size;
          const names=(entitlements.data??[])
            .filter(e=>e.contract_id===pool.contract_id)
            .map(e=>productNames.get(e.product_id)??e.product_id);
          return (
            <div key={pool.contract_id} className="rounded-lg border p-4 text-sm">
              <strong>{contractsById.get(pool.contract_id)??pool.contract_id}</strong>
              <p>Licenças: {used} / {pool.license_limit}</p>
              <p>Controle: {pool.enforcement_mode}</p>
              <p>Produtos: {names.join(', ') || 'Nenhum produto vinculado'}</p>
            </div>
          );
        })}
      </section>
    </main>
  );
}

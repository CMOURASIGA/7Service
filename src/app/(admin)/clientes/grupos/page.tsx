import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { GroupForms } from './forms';

export const dynamic = 'force-dynamic';

export default async function CustomerGroupsPage() {
  await requirePermission('clients.manage');
  const db = createAdminClient() as unknown as SupabaseClient;
  const [groups, clients, members] = await Promise.all([
    db.from('customer_groups').select('id,name,status').order('name'),
    db.from('clients').select('id,legal_name,trade_name').eq('status','ACTIVE').order('legal_name'),
    db.from('customer_group_members').select('group_id,client_id,status').eq('status','ACTIVE'),
  ]);
  if (groups.error || clients.error || members.error) {
    return (
      <main className="flex flex-col gap-3">
        <Link className="text-sm text-brand-700 underline" href="/clientes">Clientes</Link>
        <h1 className="text-xl font-semibold">Grupos empresariais</h1>
        <p role="alert">A estrutura de grupos ainda não foi aplicada neste ambiente.</p>
      </main>
    );
  }
  const companyNames = new Map((clients.data ?? []).map(c =>
    [c.id, c.trade_name || c.legal_name]));
  return (
    <main className="flex flex-col gap-6">
      <div>
        <Link className="text-sm text-brand-700 underline" href="/clientes">Clientes</Link>
        <h1 className="text-xl font-semibold">Grupos empresariais</h1>
        <p className="text-muted text-sm">
          Um grupo pode incluir diversas empresas e compartilhar licenças nominais
          de um contrato, preservando os perfis de cada produto e empresa.
        </p>
      </div>
      <GroupForms
        groups={(groups.data ?? []).filter(g=>g.status==='ACTIVE').map(g=>({id:g.id,label:g.name}))}
        clients={(clients.data ?? []).map(c=>({id:c.id,label:c.trade_name || c.legal_name}))}
      />
      <section className="space-y-3">
        <h2 className="font-semibold">Grupos existentes</h2>
        {(groups.data ?? []).map(g => (
          <div key={g.id} className="rounded-lg border p-4">
            <p className="font-medium">{g.name} / {g.status}</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {(members.data ?? []).filter(m=>m.group_id===g.id).map(m=>(
                <li key={m.client_id}>{companyNames.get(m.client_id) ?? m.client_id}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}

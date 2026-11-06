import Link from 'next/link';

import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Acessos por produto - 7Service',
};

type AccessRow = {
  identityId: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
  productName: string;
  productCode: string;
  roleName: string;
  status: string;
  destination: string;
};

export default async function AccessManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; historico?: string }>;
}) {
  await requirePermission('users.manage');
  const params = await searchParams;
  const showHistory = params.historico === '1';
  const db = createAdminClient();

  const [clientsResult, identitiesResult, membershipsResult, subscriptionsResult, grantsResult, productsResult, rolesResult] =
    await Promise.all([
      db.from('clients').select('id,legal_name,trade_name,status').order('legal_name'),
      db.from('identities').select('id,first_name,last_name,email,status,auth_user_id'),
      db.from('client_memberships').select('identity_id,client_id,status'),
      db.from('subscriptions').select('id,client_id,product_id,status'),
      db.from('user_product_access').select('id,identity_id,client_id,subscription_id,product_role_id,status'),
      db.from('products').select('id,code,name,status'),
      db.from('product_roles').select('id,name,code,status'),
    ]);

  if (
    [clientsResult, identitiesResult, membershipsResult, subscriptionsResult, grantsResult, productsResult, rolesResult].some(
      (result) => result.error,
    )
  ) {
    throw new Error('Falha ao consultar concessões. Nenhum acesso foi alterado.');
  }

  const clients = clientsResult.data ?? [];
  const identities = new Map((identitiesResult.data ?? []).map((item) => [item.id, item]));
  const memberships = new Set(
    (membershipsResult.data ?? [])
      .filter((membership) => membership.status === 'ACTIVE')
      .map((membership) => membership.identity_id + ':' + membership.client_id),
  );
  const subscriptions = new Map((subscriptionsResult.data ?? []).map((item) => [item.id, item]));
  const products = new Map((productsResult.data ?? []).map((item) => [item.id, item]));
  const roles = new Map((rolesResult.data ?? []).map((item) => [item.id, item]));
  const companies = new Map(clients.map((item) => [item.id, item]));
  const rows: AccessRow[] = (grantsResult.data ?? [])
    .flatMap((grant) => {
      const identity = identities.get(grant.identity_id);
      const subscription = subscriptions.get(grant.subscription_id);
      const company = companies.get(grant.client_id);
      const product = subscription ? products.get(subscription.product_id) : null;
      const role = roles.get(grant.product_role_id);
      if (!identity || !subscription || !company || !product) return [];
      const valid =
        grant.status === 'ACTIVE' &&
        identity.status === 'ACTIVE' &&
        subscription.status === 'ACTIVE' &&
        product.status === 'ACTIVE' &&
        company.status === 'ACTIVE' &&
        memberships.has(identity.id + ':' + company.id);
      const current = company.status === 'ACTIVE' && product.status === 'ACTIVE';
      if (!showHistory && !current) return [];
      if (params.client && company.id !== params.client) return [];
      return [
        {
          identityId: identity.id,
          name: [identity.first_name, identity.last_name].filter(Boolean).join(' '),
          email: identity.email,
          companyId: company.id,
          companyName: company.trade_name || company.legal_name,
          productName: product.name,
          productCode: product.code,
          roleName: role?.name ?? 'Perfil não identificado',
          status: valid ? 'Autorização ativa' : 'Sem autorização efetiva',
          destination: 'Não verificado',
        },
      ];
    })
    .sort((a, b) => a.companyName.localeCompare(b.companyName) || a.name.localeCompare(b.name));

  const activeClients = clients.filter((client) => client.status === 'ACTIVE');

  return (
    <main className="flex flex-col gap-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Acessos por produto</h1>
        <p className="text-sm text-slate-700">
          Visão central de identidades, empresas, produtos e concessões. A autorização no 7Service
          não comprova sozinha o provisionamento no produto de destino.
        </p>
      </header>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        A situação de provisionamento só poderá ser marcada como validada após uma consulta
        autenticada ao sistema de destino. Sem confirmação técnica, a coluna indica
        &quot;Não verificado&quot;. Nenhuma conta é criada automaticamente nesta tela.
      </div>
      <form action="/acessos" className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
        <label className="flex min-w-64 flex-col gap-1 text-sm">
          Cliente
          <select name="client" defaultValue={params.client ?? ''} className="rounded border p-2">
            <option value="">Todos os clientes</option>
            {activeClients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.trade_name || client.legal_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="historico" value="1" defaultChecked={showHistory} />
          Incluir histórico
        </label>
        <button className="rounded bg-blue-900 px-4 py-2 text-sm font-semibold text-white">
          Filtrar
        </button>
      </form>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="p-3">Empresa</th>
              <th className="p-3">Pessoa</th>
              <th className="p-3">Produto e papel</th>
              <th className="p-3">Concessão central</th>
              <th className="p-3">Conta no produto</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.identityId + ':' + row.companyId + ':' + row.productCode + ':' + index} className="border-b last:border-0">
                <td className="p-3">{row.companyName}</td>
                <td className="p-3">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-slate-600">{row.email}</div>
                </td>
                <td className="p-3">
                  {row.productName}
                  <div className="text-xs text-slate-600">{row.roleName}</div>
                </td>
                <td className="p-3">{row.status}</td>
                <td className="p-3">{row.destination}</td>
                <td className="p-3">
                  <Link className="text-blue-700 underline" href={`/usuarios/${row.identityId}`}>
                    Gerenciar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="p-6 text-sm text-slate-600">
            Nenhuma concessão encontrada. Cadastre um cliente, uma assinatura e a identidade antes
            de conceder acesso.
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="text-blue-700 underline" href="/clientes/novo">
          Cadastrar cliente
        </Link>
        <Link className="text-blue-700 underline" href="/usuarios">
          Cadastrar identidade
        </Link>
        <Link className="text-blue-700 underline" href="/ajuda">
          Ver procedimento completo
        </Link>
      </div>
    </main>
  );
}

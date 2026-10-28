import Link from 'next/link';

import { StatusBadge } from '@/components/ui/status-badge';
import { NewIdentityForm } from '@/features/identities/components/new-identity-form';
import { requirePermission } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { IDENTITY_STATUS_LABEL } from '@/lib/status-labels';

export const metadata = {
  title: 'Usuários - 7Service',
};

export default async function IdentitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  await requirePermission('users.manage');
  const db = await createClient();
  let query = db
    .from('identities')
    .select(
      'id,first_name,last_name,email,status,client_memberships(status,clients(legal_name,trade_name)),user_product_access(status)',
    )
    .order('first_name');
  if (params.q?.trim()) {
    const term = params.q.trim().replace(/[,%()]/g, '');
    query = query.or(
      'first_name.ilike.%' + term + '%,last_name.ilike.%' + term + '%,email.ilike.%' + term + '%',
    );
  }
  const { data: identities, error } = await query;
  const {data:clients,error:clientsError} = await db.from('clients').select('id,legal_name,trade_name').eq('status','ACTIVE').order('legal_name');
  if(clientsError) throw new Error('Falha ao consultar empresas');
  if (error) throw new Error('Falha ao consultar identidades');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-xl font-semibold">Usuários</h1>
        <p className="text-muted text-sm">
          Busca global por nome ou e-mail, com cliente e produtos.
        </p>
      </div>

      <NewIdentityForm clients={clients ?? []} />
      <form className="flex gap-2" action="/usuarios">
        <input
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="Buscar por nome ou e-mail"
          className="border-border focus:border-brand-600 focus:ring-brand-100 w-full max-w-md rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
        />
        <button
          type="submit"
          className="border-border rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Buscar
        </button>
      </form>

      <div className="border-border bg-background overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-border text-muted border-b bg-slate-50 text-xs">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">E-mail</th>
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium">Produtos ativos</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(identities ?? []).map((identity) => {
              const clients = identity.client_memberships
                .filter((x) => x.status === 'ACTIVE')
                .map((x) => x.clients?.trade_name || x.clients?.legal_name)
                .filter(Boolean);
              const activeProducts = identity.user_product_access.filter(
                (x) => x.status === 'ACTIVE',
              ).length;
              const statusInfo =
                IDENTITY_STATUS_LABEL[identity.status as keyof typeof IDENTITY_STATUS_LABEL];

              return (
                <tr
                  key={identity.id}
                  className="border-border border-b last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/usuarios/${identity.id}`}
                      className="text-brand-700 font-medium hover:underline"
                    >
                      {identity.first_name} {identity.last_name}
                    </Link>
                  </td>
                  <td className="text-muted px-4 py-2">{identity.email}</td>
                  <td className="text-muted px-4 py-2">{clients.join(', ') || '—'}</td>
                  <td className="text-muted px-4 py-2">{activeProducts}</td>
                  <td className="px-4 py-2">
                    <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

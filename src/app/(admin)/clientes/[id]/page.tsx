import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { ClientForm } from '@/features/clients/components/client-form';
import { ContractForm } from '@/features/contracts/components/contract-form';
import { SubscriptionForm } from '@/features/subscriptions/components/subscription-form';
import { CLIENT_STATUS_LABEL } from '@/lib/status-labels';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmAction } from '@/components/ui/confirm-action';
import {
  updateClientAction,
  suspendClientAction,
  reactivateClientAction,
  closeClientAction,
  createContractAction,
  createSubscriptionAction,
} from '../actions';
import type { Client, ClientAddress, ClientStatus, Contract, Product } from '@/types/domain';

export const dynamic = 'force-dynamic';
export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('clients.view');
  const { id } = await params;
  const db = await createClient();
  const { data: row, error } = await db.from('clients').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('Falha ao consultar cliente');
  if (!row) notFound();
  const [addresses, subscriptions, memberships, contracts, products] = await Promise.all([
    db.from('client_addresses').select('*').eq('client_id', id).order('created_at').limit(1),
    db
      .from('subscriptions')
      .select('id,product_id,status,license_limit,end_date,products(name)')
      .eq('client_id', id),
    db
      .from('client_memberships')
      .select('id,status,identities(first_name,last_name,email)')
      .eq('client_id', id),
    db
      .from('contracts')
      .select('id,reference,status,start_date,end_date,notes,created_at')
      .eq('client_id', id),
    db
      .from('products')
      .select('id,code,name,status,entry_url,login_url,logo_path,description,created_at')
      .eq('status', 'ACTIVE'),
  ]);
  if ([addresses, subscriptions, memberships, contracts, products].some((r) => r.error))
    throw new Error('Falha ao consultar dados vinculados ao cliente');
  const a = addresses.data?.[0];
  const address: ClientAddress | null = a
    ? {
        postalCode: a.postal_code,
        street: a.street,
        number: a.number,
        complement: a.complement,
        district: a.district,
        city: a.city,
        state: a.state,
        country: a.country,
      }
    : null;
  const client: Client = {
    id: row.id,
    personType: row.person_type as Client['personType'],
    document: row.document,
    legalName: row.legal_name,
    tradeName: row.trade_name,
    phone: row.phone,
    email: row.email,
    contactName: row.contact_name,
    status: row.status as ClientStatus,
    notes: row.notes,
    relationshipStartDate: row.relationship_start_date,
    address,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  const contractOptions: Contract[] = (contracts.data ?? []).map((x) => ({
    id: x.id,
    clientId: id,
    reference: x.reference,
    startDate: x.start_date,
    endDate: x.end_date,
    status: x.status as Contract['status'],
    notes: x.notes,
    documents: [],
    createdAt: x.created_at,
  }));
  const productOptions: Product[] = (products.data ?? []).map((x) => ({
    id: x.id,
    code: x.code,
    name: x.name,
    description: x.description,
    status: x.status as Product['status'],
    entryUrl: x.entry_url,
    loginUrl: x.login_url,
    logoPath: x.logo_path,
    createdAt: x.created_at,
    roles: [],
    modules: [],
    features: [],
  }));
  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/clientes" className="text-brand-700 text-sm underline">
            Clientes
          </Link>
          <h1 className="text-xl font-semibold">{client.tradeName || client.legalName}</h1>
          <p className="text-muted text-sm">{client.document}</p>
        </div>
        <StatusBadge
          label={CLIENT_STATUS_LABEL[client.status].label}
          tone={CLIENT_STATUS_LABEL[client.status].tone}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Link className="rounded border px-3 py-2 text-sm" href={`/clientes/${id}/ambientes`}>
          Ambientes
        </Link>
        {client.status === 'ACTIVE' ? (
          <ConfirmAction
            triggerLabel="Suspender cliente"
            action={suspendClientAction.bind(null, id)}
            impactMessage="Suspende o cadastro administrativo do cliente."
            requireReason
            tone="danger"
            confirmLabel="Suspender"
          />
        ) : null}
        {client.status === 'SUSPENDED' ? (
          <ConfirmAction
            triggerLabel="Reativar cliente"
            action={reactivateClientAction.bind(null, id)}
            impactMessage="Reativa o cadastro administrativo."
            confirmLabel="Reativar"
          />
        ) : null}
        {client.status !== 'CLOSED' ? (
          <ConfirmAction
            triggerLabel="Encerrar cliente"
            action={closeClientAction.bind(null, id)}
            impactMessage="Encerra o cadastro e preserva o historico."
            requireReason
            tone="danger"
            confirmLabel="Encerrar"
          />
        ) : null}
      </div>
      <section className="rounded-lg border p-5">
        <h2 className="mb-4 font-semibold">Dados cadastrais</h2>
        <ClientForm
          client={client}
          action={updateClientAction.bind(null, id)}
          submitLabel="Salvar alteracoes"
        />
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-5">
          <h2 className="mb-2 font-semibold">Contratos</h2>
          <ContractForm action={createContractAction.bind(null, id)} />
          {!contracts.data?.length ? (
            <p className="text-muted text-sm">Nenhum contrato registrado.</p>
          ) : (
            <ul>
              {contracts.data.map((c) => (
                <li key={c.id} className="border-b py-2 text-sm">
                  {c.reference} · {c.status}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border p-5">
          <h2 className="mb-2 font-semibold">Produtos contratados</h2>
          <SubscriptionForm
            action={createSubscriptionAction.bind(null, id)}
            contracts={contractOptions}
            products={productOptions}
          />
          {!subscriptions.data?.length ? (
            <p className="text-muted text-sm">Nenhuma assinatura registrada.</p>
          ) : (
            <ul>
              {subscriptions.data.map((s) => (
                <li key={s.id} className="border-b py-2 text-sm">
                  {s.products?.name ?? s.product_id} · {s.status} · {s.license_limit} licencas
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border p-5">
          <h2 className="mb-2 font-semibold">Usuarios vinculados</h2>
          {!memberships.data?.length ? (
            <p className="text-muted text-sm">Nenhuma identidade vinculada.</p>
          ) : (
            <ul>
              {memberships.data.map((m) => (
                <li key={m.id} className="border-b py-2 text-sm">
                  {m.identities?.first_name} {m.identities?.last_name} · {m.status}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

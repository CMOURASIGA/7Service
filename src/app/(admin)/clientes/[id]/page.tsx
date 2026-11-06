import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { ClientForm } from '@/features/clients/components/client-form';
import { ClientFeaturesPanel } from '@/features/clients/components/client-features-panel';
import { ContractForm } from '@/features/contracts/components/contract-form';
import { UploadDocumentForm } from '@/features/contracts/components/upload-document-form';
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
  uploadContractDocumentAction,
} from '../actions';
import type { Client, ClientAddress, ClientStatus, Contract, Product } from '@/types/domain';

export const dynamic = 'force-dynamic';
export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('clients.view');
  const { id } = await params;
  const db = createAdminClient();
  const { data: row, error } = await db.from('clients').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('Falha ao consultar cliente');
  if (!row) notFound();
  const [addresses, subscriptions, memberships, contracts, products] = await Promise.all([
    db.from('client_addresses').select('*').eq('client_id', id).order('created_at').limit(1),
    db
      .from('subscriptions')
      .select('id,product_id,status,license_limit,end_date')
      .eq('client_id', id),
    db.from('client_memberships').select('id,status,identity_id').eq('client_id', id),
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
  const productIds = [
    ...new Set((subscriptions.data ?? []).map((subscription) => subscription.product_id)),
  ];
  const identityIds = [
    ...new Set((memberships.data ?? []).map((membership) => membership.identity_id)),
  ];
  const [subscriptionProducts, membershipIdentities] = await Promise.all([
    productIds.length
      ? db.from('products').select('id,name').in('id', productIds)
      : Promise.resolve({ data: [], error: null }),
    identityIds.length
      ? db.from('identities').select('id,first_name,last_name,email').in('id', identityIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (subscriptionProducts.error || membershipIdentities.error)
    throw new Error('Falha ao consultar referências vinculadas ao cliente');
  const subscriptionProductNames = new Map(
    (subscriptionProducts.data ?? []).map((product) => [product.id, product.name]),
  );
  const membershipIdentityNames = new Map(
    (membershipIdentities.data ?? []).map((identity) => [
      identity.id,
      `${identity.first_name} ${identity.last_name}`.trim(),
    ]),
  );
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
  const contractIds = (contracts.data ?? []).map((c) => c.id);
  const docsResult = contractIds.length
    ? await db
        .from('contract_documents')
        .select('id,contract_id,original_name,size_bytes,uploaded_at')
        .in('contract_id', contractIds)
        .order('uploaded_at', { ascending: false })
    : { data: [], error: null };
  if (docsResult.error) throw new Error('Falha ao carregar documentos de contratos');
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
      <ClientFeaturesPanel clientId={id} />
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-5">
          <h2 className="mb-2 font-semibold">Contratos</h2>
          <ContractForm action={createContractAction.bind(null, id)} />
          {!contracts.data?.length ? (
            <p className="text-muted text-sm">Nenhum contrato registrado.</p>
          ) : (
            <ul>
              {contracts.data.map((c) => (
                <li key={c.id} className="border-b py-3 text-sm">
                  <div className="font-medium">
                    {c.reference} · {c.status}
                  </div>
                  <UploadDocumentForm action={uploadContractDocumentAction.bind(null, id, c.id)} />
                  {(docsResult.data ?? []).filter((d) => d.contract_id === c.id).length ? (
                    <ul className="mt-2 space-y-1">
                      {(docsResult.data ?? [])
                        .filter((d) => d.contract_id === c.id)
                        .map((d) => (
                          <li key={d.id}>
                            <a
                              className="text-brand-700 underline"
                              target="_blank"
                              rel="noopener noreferrer"
                              href={`/api/contracts/${c.id}/documents/${d.id}`}
                            >
                              {d.original_name} ({Math.ceil(d.size_bytes / 1024)} KB)
                            </a>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-muted text-xs">Nenhum PDF anexado.</p>
                  )}
                </li>
              ))}{' '}
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
                  {subscriptionProductNames.get(s.product_id) ?? s.product_id} · {s.status} ·{' '}
                  {s.license_limit} licencas
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
                  {membershipIdentityNames.get(m.identity_id) ?? m.identity_id} · {m.status}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ConfirmAction } from '@/components/ui/confirm-action';
import { StatusBadge } from '@/components/ui/status-badge';
import { getSubscriptionEffectiveStatus } from '@/lib/domain-rules';
import { getMockStore } from '@/lib/mock/store';
import {
  CLIENT_STATUS_LABEL,
  IDENTITY_STATUS_LABEL,
  SUBSCRIPTION_EFFECTIVE_STATUS_LABEL,
} from '@/lib/status-labels';
import { listAuditLogs } from '@/services/audit';
import { getClient } from '@/services/clients';
import { ClientForm } from '@/features/clients/components/client-form';

import { reactivateClientAction, suspendClientAction, updateClientAction } from '../actions';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getClient(id);

  if (!client) {
    notFound();
  }

  const store = getMockStore();
  const subscriptions = store.subscriptions.filter((s) => s.clientId === id);
  const identities = store.identities.filter((i) => i.clientId === id);
  const auditLogs = listAuditLogs({ clientId: id });
  const statusInfo = CLIENT_STATUS_LABEL[client.status];

  const updateAction = updateClientAction.bind(null, id);
  const suspendAction = suspendClientAction.bind(null, id);
  const reactivateAction = reactivateClientAction.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-foreground text-xl font-semibold">
              {client.tradeName || client.legalName}
            </h1>
            <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
          </div>
          <p className="text-muted text-sm">
            {client.personType === 'PJ' ? 'CNPJ' : 'CPF'}: {client.document} · Cliente desde{' '}
            {new Date(client.relationshipStartDate).toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="flex gap-2">
          {client.status === 'ACTIVE' ? (
            <ConfirmAction
              triggerLabel="Suspender cliente"
              impactMessage="O cliente será suspenso. Isso não remove contratos, usuários ou histórico — apenas sinaliza a suspensão administrativa. Cada assinatura por produto continua com sua própria vigência."
              action={suspendAction}
              requireReason
              tone="danger"
              confirmLabel="Suspender"
            />
          ) : client.status === 'SUSPENDED' ? (
            <ConfirmAction
              triggerLabel="Reativar cliente"
              impactMessage="O cliente voltará ao status ativo."
              action={reactivateAction}
              confirmLabel="Reativar"
            />
          ) : null}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="border-border bg-background rounded-lg border p-6">
            <h2 className="text-foreground mb-4 text-sm font-semibold">Dados cadastrais</h2>
            <ClientForm action={updateAction} client={client} submitLabel="Salvar alterações" />
          </div>

          <div className="border-border bg-background rounded-lg border p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-foreground text-sm font-semibold">Produtos contratados</h2>
              <span className="text-muted text-xs">
                Etapa 5/6 entregam contratação completa por aqui
              </span>
            </div>
            {subscriptions.length === 0 ? (
              <p className="text-muted text-sm">Nenhuma assinatura registrada ainda.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {subscriptions.map((sub) => {
                  const product = store.products.find((p) => p.id === sub.productId);
                  const effective = getSubscriptionEffectiveStatus(sub);
                  const effectiveInfo = SUBSCRIPTION_EFFECTIVE_STATUS_LABEL[effective];
                  return (
                    <li
                      key={sub.id}
                      className="border-border flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="text-foreground font-medium">
                        {product?.name ?? sub.productId}
                      </span>
                      <span className="text-muted">
                        até{' '}
                        {sub.endDate
                          ? new Date(sub.endDate).toLocaleDateString('pt-BR')
                          : 'indeterminado'}
                      </span>
                      <StatusBadge label={effectiveInfo.label} tone={effectiveInfo.tone} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-border bg-background rounded-lg border p-6">
            <h2 className="text-foreground mb-3 text-sm font-semibold">Usuários</h2>
            {identities.length === 0 ? (
              <p className="text-muted text-sm">Nenhum usuário cadastrado para este cliente.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {identities.map((identity) => {
                  const identityStatus = IDENTITY_STATUS_LABEL[identity.status];
                  return (
                    <li
                      key={identity.id}
                      className="border-border flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <Link
                        href={`/usuarios/${identity.id}`}
                        className="text-brand-700 font-medium hover:underline"
                      >
                        {identity.firstName} {identity.lastName}
                      </Link>
                      <span className="text-muted">{identity.email}</span>
                      <StatusBadge label={identityStatus.label} tone={identityStatus.tone} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="border-border bg-background rounded-lg border p-6">
            <h2 className="text-foreground mb-3 text-sm font-semibold">Histórico / Auditoria</h2>
            {auditLogs.length === 0 ? (
              <p className="text-muted text-sm">Sem eventos registrados ainda.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {auditLogs.map((log) => (
                  <li key={log.id} className="text-xs">
                    <div className="text-foreground font-medium">{log.action}</div>
                    <div className="text-muted">
                      {log.actorLabel} · {new Date(log.occurredAt).toLocaleString('pt-BR')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

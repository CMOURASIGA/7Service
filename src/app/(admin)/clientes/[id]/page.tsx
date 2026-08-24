import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ConfirmAction } from '@/components/ui/confirm-action';
import { StatusBadge } from '@/components/ui/status-badge';
import { ContractForm } from '@/features/contracts/components/contract-form';
import { UploadDocumentForm } from '@/features/contracts/components/upload-document-form';
import { ClientForm } from '@/features/clients/components/client-form';
import { SubscriptionForm } from '@/features/subscriptions/components/subscription-form';
import { getSubscriptionEffectiveStatus } from '@/lib/domain-rules';
import { getMockStore } from '@/lib/mock/store';
import {
  CLIENT_STATUS_LABEL,
  IDENTITY_STATUS_LABEL,
  SUBSCRIPTION_EFFECTIVE_STATUS_LABEL,
} from '@/lib/status-labels';
import { listAuditLogs } from '@/services/audit';
import { getClient } from '@/services/clients';
import { listContractsForClient } from '@/services/contracts';

import {
  closeClientAction,
  createContractAction,
  createSubscriptionAction,
  reactivateClientAction,
  recordExportDeliveryAction,
  suspendClientAction,
  updateClientAction,
  uploadContractDocumentAction,
} from '../actions';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getClient(id);

  if (!client) {
    notFound();
  }

  const store = getMockStore();
  const contracts = listContractsForClient(id);
  const subscriptions = store.subscriptions.filter((s) => s.clientId === id);
  const identities = store.identities.filter((i) => i.clientId === id);
  const auditLogs = listAuditLogs({ clientId: id });
  const statusInfo = CLIENT_STATUS_LABEL[client.status];
  const activeProducts = store.products.filter((p) => p.status === 'ACTIVE');

  const updateAction = updateClientAction.bind(null, id);
  const suspendAction = suspendClientAction.bind(null, id);
  const reactivateAction = reactivateClientAction.bind(null, id);
  const closeAction = closeClientAction.bind(null, id);
  const deliveryAction = recordExportDeliveryAction.bind(null, id);
  const newContractAction = createContractAction.bind(null, id);
  const newSubscriptionAction = createSubscriptionAction.bind(null, id);

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

        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/clients/${id}/export`}
            className="border-border rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            Exportar dados
          </a>
          <ConfirmAction
            triggerLabel="Registrar entrega"
            impactMessage="Confirma que o pacote de dados foi entregue/comunicado ao cliente. Gera registro formal na auditoria (client.export_delivered)."
            action={deliveryAction}
            confirmLabel="Registrar"
          />
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
          {client.status !== 'CLOSED' ? (
            <ConfirmAction
              triggerLabel="Encerrar cliente"
              impactMessage="O cliente passa para ENCERRADO. Dados são preservados (sem exclusão física); acessos seguem regidos pelas assinaturas. Recomendado exportar os dados antes de encerrar."
              action={closeAction}
              requireReason
              tone="danger"
              confirmLabel="Encerrar"
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
            <h2 className="text-foreground mb-3 text-sm font-semibold">Contratos</h2>
            <ContractForm action={newContractAction} />
            {contracts.length === 0 ? (
              <p className="text-muted mt-4 text-sm">Nenhum contrato cadastrado ainda.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {contracts.map((contract) => {
                  const uploadAction = uploadContractDocumentAction.bind(null, id, contract.id);
                  return (
                    <li key={contract.id} className="border-border rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-foreground font-medium">{contract.reference}</span>
                        <span className="text-muted text-xs">
                          {new Date(contract.startDate).toLocaleDateString('pt-BR')}
                          {contract.endDate
                            ? ` – ${new Date(contract.endDate).toLocaleDateString('pt-BR')}`
                            : ''}
                        </span>
                      </div>
                      {contract.documents.length > 0 ? (
                        <ul className="mb-2 flex flex-col gap-1">
                          {contract.documents.map((doc) => (
                            <li key={doc.id} className="text-muted text-xs">
                              📄 {doc.originalName} ({Math.round(doc.sizeBytes / 1024)} KB) —
                              armazenamento privado
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <UploadDocumentForm action={uploadAction} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-border bg-background rounded-lg border p-6">
            <h2 className="text-foreground mb-3 text-sm font-semibold">Produtos contratados</h2>
            <SubscriptionForm
              action={newSubscriptionAction}
              contracts={contracts}
              products={activeProducts}
            />
            {subscriptions.length === 0 ? (
              <p className="text-muted mt-4 text-sm">Nenhuma assinatura registrada ainda.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
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

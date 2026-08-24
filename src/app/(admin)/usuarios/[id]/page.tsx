import { notFound } from 'next/navigation';

import { ConfirmAction } from '@/components/ui/confirm-action';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  GrantAccessForm,
  type GrantableSubscription,
} from '@/features/access/components/grant-access-form';
import { getMockStore } from '@/lib/mock/store';
import { ACCESS_STATUS_LABEL, IDENTITY_STATUS_LABEL } from '@/lib/status-labels';
import { listAuditLogs } from '@/services/audit';
import { getIdentity } from '@/services/identities';

import {
  grantAccessAction,
  initiateRecoveryAction,
  reactivateAccessAction,
  revokeAccessAction,
  suspendAccessAction,
} from './actions';

export default async function IdentityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = getIdentity(id);
  if (!identity) {
    notFound();
  }

  const store = getMockStore();
  const client = store.clients.find((c) => c.id === identity.clientId);
  const access = store.userProductAccess.filter((a) => a.identityId === id);
  const grantedSubscriptionIds = new Set(access.map((a) => a.subscriptionId));
  const invitations = store.invitations.filter((inv) => inv.identityId === id);
  const auditLogs = listAuditLogs().filter(
    (log) => log.targetId === id || access.some((a) => a.id === log.targetId),
  );
  const statusInfo = IDENTITY_STATUS_LABEL[identity.status];

  const grantOptions: GrantableSubscription[] = store.subscriptions
    .filter((s) => s.clientId === identity.clientId && !grantedSubscriptionIds.has(s.id))
    .map((subscription) => ({
      subscription,
      product: store.products.find((p) => p.id === subscription.productId)!,
    }))
    .filter((o) => o.product);

  const boundGrantAccess = grantAccessAction.bind(null, id);
  const boundInitiateRecovery = initiateRecoveryAction.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-foreground text-xl font-semibold">
            {identity.firstName} {identity.lastName}
          </h1>
          <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
        </div>
        <p className="text-muted text-sm">
          {identity.email} · {client?.tradeName ?? client?.legalName ?? 'Cliente não encontrado'}
        </p>
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="border-border bg-background rounded-lg border p-6">
            <h2 className="text-foreground mb-3 text-sm font-semibold">Acessos aos produtos</h2>

            <div className="border-border mb-4 rounded-md border border-dashed p-3">
              <p className="text-muted mb-2 text-xs font-medium">Adicionar produto ao usuário</p>
              <GrantAccessForm action={boundGrantAccess} options={grantOptions} />
            </div>

            {access.length === 0 ? (
              <p className="text-muted text-sm">Nenhum acesso concedido ainda.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {access.map((a) => {
                  const subscription = store.subscriptions.find((s) => s.id === a.subscriptionId);
                  const product = store.products.find((p) => p.id === subscription?.productId);
                  const role = product?.roles.find((r) => r.id === a.productRoleId);
                  const accessStatus = ACCESS_STATUS_LABEL[a.status];

                  const suspend = suspendAccessAction.bind(null, a.id, id);
                  const reactivate = reactivateAccessAction.bind(null, a.id, id);
                  const revoke = revokeAccessAction.bind(null, a.id, id);

                  return (
                    <li key={a.id} className="border-border rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-foreground font-medium">
                          {product?.name ?? 'Produto'}
                        </span>
                        <StatusBadge label={accessStatus.label} tone={accessStatus.tone} />
                      </div>
                      <p className="text-muted mb-2 text-xs">Perfil: {role?.name ?? '—'}</p>
                      <div className="flex gap-2">
                        {a.status === 'ACTIVE' ? (
                          <>
                            <ConfirmAction
                              triggerLabel="Suspender acesso"
                              impactMessage={`O acesso a ${product?.name} será suspenso. Os demais produtos do usuário não são afetados.`}
                              action={suspend}
                              requireReason
                              tone="danger"
                              confirmLabel="Suspender"
                            />
                            <ConfirmAction
                              triggerLabel="Revogar acesso"
                              impactMessage={`O acesso a ${product?.name} será revogado permanentemente (histórico preservado).`}
                              action={revoke}
                              requireReason
                              tone="danger"
                              confirmLabel="Revogar"
                            />
                          </>
                        ) : a.status === 'SUSPENDED' ? (
                          <ConfirmAction
                            triggerLabel="Reativar acesso"
                            impactMessage={`O acesso a ${product?.name} será reativado.`}
                            action={reactivate}
                            confirmLabel="Reativar"
                          />
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-border bg-background rounded-lg border p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-foreground text-sm font-semibold">Convites / Segurança</h2>
              {identity.status === 'ACTIVE' ? (
                <ConfirmAction
                  triggerLabel="Iniciar recuperação de acesso"
                  impactMessage="Um fluxo seguro de redefinição de credencial será iniciado pelo provedor de autenticação. O 7Service não visualiza nem define a senha do usuário."
                  action={boundInitiateRecovery}
                  confirmLabel="Iniciar recuperação"
                />
              ) : null}
            </div>
            {invitations.length === 0 ? (
              <p className="text-muted text-sm">Nenhum convite registrado.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {invitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="border-border flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span>{inv.status}</span>
                    <span className="text-muted">
                      expira em {new Date(inv.expiresAt).toLocaleString('pt-BR')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="border-border bg-background rounded-lg border p-6">
          <h2 className="text-foreground mb-3 text-sm font-semibold">Timeline / Auditoria</h2>
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
      </section>
    </div>
  );
}

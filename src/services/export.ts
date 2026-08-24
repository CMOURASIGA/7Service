import 'server-only';

import { generateId, getMockStore, nowIso } from '@/lib/mock/store';
import { AppError } from '@/lib/errors';
import type { Id, InternalUser } from '@/types/domain';

import { writeAudit } from './audit';

/**
 * Exportação e encerramento de cliente (Etapa 14).
 *
 * Monta o pacote de dados pertencentes ao cliente (docs/03-domains/CLIENTS.md
 * - "Portabilidade de dados"). Explicitamente NUNCA inclui: senhas, hashes,
 * tokens de convite, secrets ou dados de outros clientes.
 *
 * A geração real de ZIP fica para quando houver storage real (bucket
 * `client-exports`); em modo demonstração o pacote é retornado como JSON,
 * já estruturado por domínio, e o pedido é sempre auditado.
 */

export interface ClientExportPackage {
  generatedAt: string;
  client: unknown;
  contacts: unknown[];
  addresses: unknown[];
  contracts: unknown[];
  subscriptions: unknown[];
  identities: unknown[];
  userProductAccess: unknown[];
  invitations: Array<{ id: Id; status: string; expiresAt: string; sentAt: string | null }>;
}

export function buildClientExportPackage(clientId: Id, actor: InternalUser): ClientExportPackage {
  const store = getMockStore();
  const client = store.clients.find((c) => c.id === clientId);
  if (!client) {
    throw new AppError('NOT_FOUND', 'Cliente não encontrado');
  }

  const identities = store.identities.filter((i) => i.clientId === clientId);
  const identityIds = new Set(identities.map((i) => i.id));
  const subscriptions = store.subscriptions.filter((s) => s.clientId === clientId);
  const subscriptionIds = new Set(subscriptions.map((s) => s.id));

  const pkg: ClientExportPackage = {
    generatedAt: nowIso(),
    client,
    contacts: [],
    addresses: client.address ? [client.address] : [],
    contracts: store.contracts.filter((c) => c.clientId === clientId),
    subscriptions,
    identities,
    userProductAccess: store.userProductAccess.filter((a) => subscriptionIds.has(a.subscriptionId)),
    invitations: store.invitations
      .filter((inv) => identityIds.has(inv.identityId))
      // Token nunca sai em texto puro nem em exportação
      // (docs/03-domains/INVITATIONS.md - "Segurança").
      .map((inv) => ({
        id: inv.id,
        status: inv.status,
        expiresAt: inv.expiresAt,
        sentAt: inv.sentAt,
      })),
  };

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: 'client.export_requested',
    targetType: 'client',
    targetId: clientId,
    clientId,
    reason: `pacote gerado com ${identities.length} identidade(s), ${subscriptions.length} assinatura(s)`,
  });

  return pkg;
}

export function recordExportDelivery(clientId: Id, actor: InternalUser, note?: string) {
  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: 'client.export_delivered',
    targetType: 'client',
    targetId: clientId,
    clientId,
    reason: note ?? null,
  });

  const generatedId = generateId();
  return { deliveryId: generatedId, deliveredAt: nowIso() };
}

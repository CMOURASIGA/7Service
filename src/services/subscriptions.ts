import 'server-only';

import { generateId, getMockStore, nowIso } from '@/lib/mock/store';
import { AppError } from '@/lib/errors';
import type { Id, InternalUser, Subscription } from '@/types/domain';

import { writeAudit } from './audit';
import { getContract } from './contracts';

/**
 * Service de Assinaturas por produto (Etapa 5/6). Cada produto contratado
 * por um cliente possui sua própria assinatura, vigência e limite de
 * licenças — independente dos demais produtos do mesmo cliente
 * (docs/03-domains/LICENSES.md).
 */

export function listSubscriptionsForClient(clientId: Id): Subscription[] {
  return getMockStore()
    .subscriptions.filter((s) => s.clientId === clientId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getSubscription(id: Id): Subscription | undefined {
  return getMockStore().subscriptions.find((s) => s.id === id);
}

export interface CreateSubscriptionInput {
  clientId: Id;
  contractId: Id;
  productId: Id;
  planId?: Id | null;
  startDate: string;
  endDate?: string | null;
  graceDays?: number;
  monthlyValue?: number | null;
  implementationValue?: number | null;
  licenseLimit: number;
}

export function createSubscription(
  input: CreateSubscriptionInput,
  actor: InternalUser,
): Subscription {
  const store = getMockStore();

  const contract = getContract(input.contractId);
  if (!contract || contract.clientId !== input.clientId) {
    throw new AppError('VALIDATION_ERROR', 'Contrato inválido para este cliente');
  }

  const product = store.products.find((p) => p.id === input.productId);
  if (!product || product.status !== 'ACTIVE') {
    throw new AppError('VALIDATION_ERROR', 'Produto inválido ou inativo');
  }

  const duplicate = store.subscriptions.find(
    (s) =>
      s.clientId === input.clientId && s.productId === input.productId && s.status === 'ACTIVE',
  );
  if (duplicate) {
    throw new AppError('CONFLICT', 'Este cliente já possui uma assinatura ativa para este produto');
  }

  if (input.licenseLimit < 0) {
    throw new AppError('VALIDATION_ERROR', 'Limite de licenças não pode ser negativo');
  }

  const subscription: Subscription = {
    id: generateId(),
    clientId: input.clientId,
    contractId: input.contractId,
    productId: input.productId,
    planId: input.planId ?? null,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    graceDays: input.graceDays ?? 5,
    monthlyValue: input.monthlyValue ?? null,
    implementationValue: input.implementationValue ?? null,
    licenseLimit: input.licenseLimit,
    status: 'ACTIVE',
    createdAt: nowIso(),
  };
  store.subscriptions.push(subscription);

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: 'subscription.created',
    targetType: 'subscription',
    targetId: subscription.id,
    clientId: subscription.clientId,
    productId: subscription.productId,
  });

  return subscription;
}

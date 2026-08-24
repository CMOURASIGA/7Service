import 'server-only';

import { getLicenseUsage } from '@/lib/domain-rules';
import { generateId, getMockStore, nowIso, todayIso } from '@/lib/mock/store';
import { AppError } from '@/lib/errors';
import type { AccessStatus, Id, InternalUser, UserProductAccess } from '@/types/domain';

import { writeAudit } from './audit';

/**
 * Service de acesso por produto (Etapa 8) e validação de licença
 * (Etapa 6). A concessão de acesso é sempre validada no backend antes de
 * criar o registro (docs/01-architecture/LICENSING.md).
 */

export function listAccessForIdentity(identityId: Id): UserProductAccess[] {
  return getMockStore().userProductAccess.filter((a) => a.identityId === identityId);
}

export interface GrantAccessInput {
  identityId: Id;
  subscriptionId: Id;
  productRoleId: Id;
}

export function grantAccess(input: GrantAccessInput, actor: InternalUser): UserProductAccess {
  const store = getMockStore();

  const subscription = store.subscriptions.find((s) => s.id === input.subscriptionId);
  if (!subscription) {
    throw new AppError('NOT_FOUND', 'Assinatura não encontrada');
  }

  const usage = getLicenseUsage(subscription, store.userProductAccess, store.licenseOverrides);
  if (usage.available <= 0) {
    throw new AppError(
      'LICENSE_LIMIT_REACHED',
      'Limite de licenças atingido para esta assinatura. Uma exceção administrativa autorizada é necessária.',
    );
  }

  const existing = store.userProductAccess.find(
    (a) => a.identityId === input.identityId && a.subscriptionId === input.subscriptionId,
  );
  if (existing) {
    throw new AppError('CONFLICT', 'Este usuário já possui acesso a esta assinatura');
  }

  const access: UserProductAccess = {
    id: generateId(),
    identityId: input.identityId,
    subscriptionId: input.subscriptionId,
    productRoleId: input.productRoleId,
    status: 'ACTIVE',
    validFrom: todayIso(),
    validUntil: null,
    suspendedAt: null,
    suspendedReason: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  store.userProductAccess.push(access);

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: 'user_access.granted',
    targetType: 'user_product_access',
    targetId: access.id,
    clientId: null,
    productId: subscription.productId,
  });

  return access;
}

export function changeAccessRole(
  accessId: Id,
  productRoleId: Id,
  actor: InternalUser,
): UserProductAccess {
  const access = findAccess(accessId);
  access.productRoleId = productRoleId;
  access.updatedAt = nowIso();

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: 'user_access.role_changed',
    targetType: 'user_product_access',
    targetId: access.id,
  });

  return access;
}

export function setAccessStatus(
  accessId: Id,
  status: AccessStatus,
  actor: InternalUser,
  reason?: string,
): UserProductAccess {
  const access = findAccess(accessId);
  access.status = status;
  access.updatedAt = nowIso();
  if (status === 'SUSPENDED') {
    access.suspendedAt = nowIso();
    access.suspendedReason = reason ?? null;
  } else {
    access.suspendedAt = null;
    access.suspendedReason = null;
  }

  const actionByStatus: Record<AccessStatus, string> = {
    PENDING: 'user_access.updated',
    ACTIVE: 'user_access.reactivated',
    SUSPENDED: 'user_access.suspended',
    REVOKED: 'user_access.revoked',
    EXPIRED: 'user_access.expired',
  };

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: actionByStatus[status],
    targetType: 'user_product_access',
    targetId: access.id,
    reason: reason ?? null,
  });

  return access;
}

function findAccess(accessId: Id): UserProductAccess {
  const access = getMockStore().userProductAccess.find((a) => a.id === accessId);
  if (!access) {
    throw new AppError('NOT_FOUND', 'Acesso não encontrado');
  }
  return access;
}

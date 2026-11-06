import { AppError } from '@/lib/errors';
import type { AccessStatus, IdentityStatus } from '@/types/domain';

/**
 * Central decision used by authorization checks after access revocation.
 * A valid session alone never grants access to a product.
 */
export function canUseProductAccess(input: {
  identityStatus: IdentityStatus;
  accessStatus: AccessStatus;
  subscriptionStatus: 'ACTIVE' | 'DRAFT' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';
  clientStatus: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  validFrom?: string | null;
  validUntil?: string | null;
  at: string;
}): boolean {
  if (
    input.identityStatus !== 'ACTIVE' ||
    input.accessStatus !== 'ACTIVE' ||
    input.subscriptionStatus !== 'ACTIVE' ||
    input.clientStatus !== 'ACTIVE'
  )
    return false;

  const at = Date.parse(input.at);
  if (!Number.isFinite(at)) throw new AppError('VALIDATION_ERROR', 'Data de verificação inválida');
  if (input.validFrom !== null && input.validFrom !== undefined) {
    const startsAt = Date.parse(input.validFrom);
    if (!Number.isFinite(startsAt))
      throw new AppError('VALIDATION_ERROR', 'Início de acesso inválido');
    if (at < startsAt) return false;
  }
  if (input.validUntil !== null && input.validUntil !== undefined) {
    const expiresAt = Date.parse(input.validUntil);
    if (!Number.isFinite(expiresAt))
      throw new AppError('VALIDATION_ERROR', 'Validade de acesso inválida');
    if (at >= expiresAt) return false;
  }
  return true;
}

/** Revocation is terminal for the same grant; reinstatement requires a new grant. */
export function revokeAccess(currentStatus: AccessStatus): AccessStatus {
  if (currentStatus === 'REVOKED') return currentStatus;
  if (currentStatus === 'EXPIRED') {
    throw new AppError('CONFLICT', 'Acesso expirado não pode ser revogado novamente');
  }
  return 'REVOKED';
}

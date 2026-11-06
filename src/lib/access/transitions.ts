import { AppError } from '@/lib/errors';
import type { AccessStatus } from '@/types/domain';

/** Prevent terminated grants being resurrected by administrative updates. */
const transitions: Record<AccessStatus, readonly AccessStatus[]> = {
  PENDING: ['PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED'],
  ACTIVE: ['ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED'],
  SUSPENDED: ['SUSPENDED', 'ACTIVE', 'REVOKED', 'EXPIRED'],
  REVOKED: ['REVOKED'],
  EXPIRED: ['EXPIRED'],
};

export function assertAccessTransition(current: AccessStatus, next: AccessStatus): void {
  if (!transitions[current]?.includes(next)) {
    throw new AppError('CONFLICT', 'Transição de acesso não permitida');
  }
}

export function assertAccessReason(next: AccessStatus, reason?: string): void {
  if (
    (next === 'SUSPENDED' || next === 'REVOKED') &&
    (!reason?.trim() || reason.trim().length < 5)
  ) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Informe uma justificativa com pelo menos cinco caracteres',
    );
  }
}

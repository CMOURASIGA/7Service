import { AppError } from '@/lib/errors';
export type EnvironmentStatus = 'ACTIVE' | 'SUSPENDED' | 'RETIRED';
export function assertEnvironmentStatusTransition(from: EnvironmentStatus, to: EnvironmentStatus): void {
  if (!['ACTIVE', 'SUSPENDED', 'RETIRED'].includes(from) || !['ACTIVE', 'SUSPENDED', 'RETIRED'].includes(to)) {
    throw new AppError('VALIDATION_ERROR', 'Status de ambiente inválido');
  }
  if (from === 'RETIRED' && to !== 'RETIRED') {
    throw new AppError('CONFLICT', 'Ambiente encerrado não pode ser reativado');
  }
}

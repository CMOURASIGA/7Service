import { AppError } from '@/lib/errors';
export type EnvironmentStatus = 'ACTIVE' | 'SUSPENDED' | 'RETIRED';
export function assertEnvironmentStatusTransition(from: EnvironmentStatus, to: EnvironmentStatus): void {
  if (from === 'RETIRED' && to !== 'RETIRED') {
    throw new AppError('CONFLICT', 'Ambiente encerrado não pode ser reativado');
  }
}

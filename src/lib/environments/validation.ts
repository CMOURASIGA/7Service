import { AppError } from '@/lib/errors';

export type EnvironmentKind = 'development' | 'homologation' | 'production';

export interface ProductEnvironmentInput {
  environment: EnvironmentKind;
  entryUrl?: string | null;
  databaseResourceRef?: string | null;
  versionSha?: string | null;
}

const shaPattern = /^[a-f0-9]{7,40}$/i;
const allowedEnvironments: EnvironmentKind[] = ['development', 'homologation', 'production'];

export function validateProductEnvironment(
  input: ProductEnvironmentInput,
): ProductEnvironmentInput {
  if (!allowedEnvironments.includes(input.environment)) {
    throw new AppError('VALIDATION_ERROR', 'Ambiente inválido');
  }

  const entryUrl = input.entryUrl?.trim() || null;
  if (entryUrl) {
    try {
      const url = new URL(entryUrl);
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.hash ||
        !url.hostname.includes('.')
      ) {
        throw new Error('unsafe url');
      }
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Informe uma URL HTTPS válida e sem credenciais');
    }
  }

  const databaseResourceRef = input.databaseResourceRef?.trim() || null;
  if (
    databaseResourceRef &&
    (databaseResourceRef.length > 200 || /[\x00-\x1f\x7f]/.test(databaseResourceRef))
  ) {
    throw new AppError('VALIDATION_ERROR', 'Referência do banco inválida');
  }

  const versionSha = input.versionSha?.trim() || null;
  if (versionSha && !shaPattern.test(versionSha)) {
    throw new AppError('VALIDATION_ERROR', 'SHA de versão inválido');
  }

  return { environment: input.environment, entryUrl, databaseResourceRef, versionSha };
}

/** Rejects duplicate environment registration for the same deployment. */
export function assertUniqueEnvironment(
  existing: Array<{ deploymentId: string; environment: EnvironmentKind }>,
  deploymentId: string,
  environment: EnvironmentKind,
): void {
  if (
    existing.some((item) => item.deploymentId === deploymentId && item.environment === environment)
  ) {
    throw new AppError('CONFLICT', 'Este ambiente já está cadastrado para a implantação');
  }
}

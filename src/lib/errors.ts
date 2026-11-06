/**
 * Erro de aplicação padronizado para uso em services/Server Actions.
 *
 * `code` deve ser estável e mapeável para mensagens de UI (loading, empty,
 * error, forbidden — docs/02-design/DESIGN_SYSTEM.md).
 */
export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UNAUTHENTICATED'
  | 'CONFLICT'
  | 'LICENSE_LIMIT_REACHED'
  | 'UNEXPECTED_ERROR';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly cause?: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

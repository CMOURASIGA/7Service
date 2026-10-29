import { AppError } from '@/lib/errors';

/**
 * Validates metadata before accepting a contractual PDF.
 * This is an input guard, NOT proof that uploaded bytes are a valid PDF.
 * Real storage handlers must also inspect content and enforce authorization.
 */
export function validateContractPdfMetadata(input: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}): void {
  const name = input.originalName.trim();
  if (
    !name ||
    name === '.' ||
    name === '..' ||
    name.includes('/') ||
    name.includes('\\') ||
    /[\x00-\x1f\x7f]/.test(name) ||
    !/\.pdf$/i.test(name)
  ) {
    throw new AppError('VALIDATION_ERROR', 'Informe um nome válido de arquivo PDF');
  }

  if (input.mimeType.toLowerCase().trim() !== 'application/pdf') {
    throw new AppError('VALIDATION_ERROR', 'Somente arquivos PDF são permitidos');
  }

  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new AppError('VALIDATION_ERROR', 'O PDF deve possuir tamanho válido');
  }
}

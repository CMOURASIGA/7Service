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
  const name = input.originalName;
  // Reject leading/trailing whitespace instead of silently normalizing filenames.
  if (
    !name ||
    name !== name.trim() ||
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

  if (
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > 10 * 1024 * 1024
  ) {
    throw new AppError('VALIDATION_ERROR', 'O PDF deve possuir tamanho válido');
  }
}

/** Initial content check. This does not replace server-side authorization or malware scanning. */
export function assertPdfSignature(bytes: Uint8Array): void {
  if (
    bytes.length < 5 ||
    bytes[0] !== 0x25 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x44 ||
    bytes[3] !== 0x46 ||
    bytes[4] !== 0x2d
  ) {
    throw new AppError('VALIDATION_ERROR', 'O arquivo não possui assinatura PDF válida');
  }
}

/** Use opaque, server-generated identifiers in private storage paths, never user filenames. */
export function contractPdfStoragePath(contractId: string, documentId: string): string {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(contractId) || !uuid.test(documentId)) {
    throw new AppError('VALIDATION_ERROR', 'Identificador de documento inválido');
  }
  return `${contractId}/${documentId}.pdf`;
}

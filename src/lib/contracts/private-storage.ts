import 'server-only';

import { requireInternalAdmin } from '@/lib/auth/require-admin';

import { createAdminClient } from '@/lib/supabase/admin';
import { AppError } from '@/lib/errors';
import { assertPdfSignature, contractPdfStoragePath, validateContractPdfMetadata } from './pdf-validation';

const BUCKET = 'contract-documents';
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Private storage primitive. Call only from an authenticated server action
 * after checking the operator's contracts.manage permission and tenant scope.
 * This module does NOT expose a public endpoint.
 */
export async function uploadPrivateContractPdf(input: {
  contractId: string;
  originalName: string;
  bytes: Uint8Array;
}): Promise<{ path: string; sizeBytes: number }> {
  await requireInternalAdmin();
  validateContractPdfMetadata({
    originalName: input.originalName,
    mimeType: 'application/pdf',
    sizeBytes: input.bytes.byteLength,
  });
  if (input.bytes.byteLength > MAX_BYTES) {
    throw new AppError('VALIDATION_ERROR', 'PDF excede o limite de 10 MB');
  }
  assertPdfSignature(input.bytes);
  const db = createAdminClient();
  const { data: contract, error: contractError } = await db.from('contracts')
    .select('id').eq('id', input.contractId).single();
  if (contractError || !contract) throw new AppError('NOT_FOUND', 'Contrato não encontrado');
  const path = contractPdfStoragePath(input.contractId, crypto.randomUUID());
  const { error } = await db.storage.from(BUCKET).upload(path, input.bytes, {
    contentType: 'application/pdf',
    upsert: false,
    cacheControl: 'private, no-store',
  });
  if (error) throw new AppError('UNEXPECTED_ERROR', 'Não foi possível armazenar o PDF');
  return { path, sizeBytes: input.bytes.byteLength };
}

/** Never return public object URLs for contracts. */
export async function createPrivateContractPdfUrl(path: string): Promise<string> {
  await requireInternalAdmin();
  const ids = path.match(/^([0-9a-f-]{36})\/([0-9a-f-]{36})\.pdf$/i);
  if (!ids || contractPdfStoragePath(ids[1], ids[2]) !== path) {
    throw new AppError('VALIDATION_ERROR', 'Caminho de contrato inválido');
  }
  const db = createAdminClient();
  const { data: contract, error: contractError } = await db.from('contracts')
    .select('id').eq('id', ids[1]).single();
  if (contractError || !contract) throw new AppError('NOT_FOUND', 'Contrato não encontrado');
  // Never sign an arbitrary existing Storage object without registered metadata.
  const { data: registered, error: metadataError } = await db
    .from('contract_files')
    .select('id')
    .eq('contract_id', ids[1])
    .eq('storage_path', path)
    .limit(1);
  if (metadataError || !registered?.length) {
    throw new AppError('NOT_FOUND', 'Documento não registrado');
  }
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) throw new AppError('NOT_FOUND', 'Documento privado indisponível');
  return data.signedUrl;
}

/** Remove a recently uploaded orphan if its metadata transaction fails. */
export async function cleanupUnregisteredContractPdf(path: string): Promise<void> {
  await requireInternalAdmin();
  const ids = path.match(/^([0-9a-f-]{36})\/([0-9a-f-]{36})\.pdf$/i);
  if (!ids || contractPdfStoragePath(ids[1], ids[2]) !== path) {
    throw new AppError('VALIDATION_ERROR', 'Caminho inválido para limpeza');
  }
  const { error } = await createAdminClient().storage.from(BUCKET).remove([path]);
  if (error) throw new AppError('UNEXPECTED_ERROR', 'Falha ao remover arquivo não registrado');
}

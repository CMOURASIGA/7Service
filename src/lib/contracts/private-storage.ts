import 'server-only';

import { requireInternalAdmin } from '@/lib/auth/require-admin';
import { recordAdminEvent } from '@/lib/audit/record-admin-event';

import { createAdminClient } from '@/lib/supabase/admin';
import { AppError } from '@/lib/errors';
import {
  assertPdfSignature,
  contractPdfStoragePath,
  validateContractPdfMetadata,
} from './pdf-validation';

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
  signedDocument?: boolean;
}): Promise<{ path: string; sizeBytes: number }> {
  const actorId = await requireInternalAdmin();
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
  const { data: contract, error: contractError } = await db
    .from('contracts')
    .select('id,client_id')
    .eq('id', input.contractId)
    .single();
  if (contractError || !contract) throw new AppError('NOT_FOUND', 'Contrato não encontrado');
  const path = contractPdfStoragePath(input.contractId, crypto.randomUUID());
  const { error } = await db.storage.from(BUCKET).upload(path, input.bytes, {
    contentType: 'application/pdf',
    upsert: false,
    cacheControl: 'private, no-store',
  });
  if (error) throw new AppError('UNEXPECTED_ERROR', 'Não foi possível armazenar o PDF');
  const { error: metadataError } = await db.from('contract_files').insert({
    contract_id: input.contractId,
    storage_path: path,
    original_name: input.originalName,
    mime_type: 'application/pdf',
    size_bytes: input.bytes.byteLength,
    signed_document: input.signedDocument ?? false,
    uploaded_by: actorId,
  });
  if (metadataError) {
    const { error: cleanupError } = await db.storage.from(BUCKET).remove([path]);
    if (cleanupError)
      throw new AppError(
        'UNEXPECTED_ERROR',
        'Falha ao registrar PDF e limpar upload; intervenção necessária',
      );
    throw new AppError('UNEXPECTED_ERROR', 'Falha ao registrar documento contratual');
  }
  try {
    await recordAdminEvent({
      actorInternalUserId: actorId,
      action: 'contract.document_uploaded',
      targetType: 'contract',
      targetId: input.contractId,
      clientId: contract.client_id,
      reason: input.signedDocument ? 'signed_document' : 'document',
    });
  } catch {
    // The PDF is already persisted. Never delete a registered document
    // to compensate for failed audit; surface the inconsistency for remediation.
    throw new AppError(
      'UNEXPECTED_ERROR',
      'Documento registrado; falha na auditoria, verificar registro',
    );
  }
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
  const { data: contract, error: contractError } = await db
    .from('contracts')
    .select('id')
    .eq('id', ids[1])
    .single();
  if (contractError || !contract) throw new AppError('NOT_FOUND', 'Contrato não encontrado');
  const { data: registered, error: registryError } = await db
    .from('contract_files')
    .select('id')
    .eq('contract_id', ids[1])
    .eq('storage_path', path)
    .limit(1);
  if (registryError || !registered?.length) throw new AppError('NOT_FOUND', 'PDF não registrado');
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) throw new AppError('NOT_FOUND', 'Documento privado indisponível');
  return data.signedUrl;
}

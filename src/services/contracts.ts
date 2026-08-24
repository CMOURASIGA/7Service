import 'server-only';

import { generateId, getMockStore, nowIso } from '@/lib/mock/store';
import { AppError } from '@/lib/errors';
import type { Contract, ContractStatus, Id, InternalUser } from '@/types/domain';

import { writeAudit } from './audit';

/**
 * Service de Contratos (Etapa 5).
 *
 * O PDF assinado deve viver em storage privado (bucket `contract-documents`,
 * ver supabase/migrations/00000000000013_storage_buckets.sql). Em modo
 * demonstração não há storage real: o upload grava apenas os metadados do
 * arquivo (nome, tipo, tamanho) com um `storagePath` simulado — os bytes
 * não são persistidos. Isso é suficiente para validar o fluxo e a UI; a
 * troca para o Supabase Storage real acontece só na implementação desta
 * função, sem mudar a tela.
 */

export function listContractsForClient(clientId: Id): Contract[] {
  return getMockStore()
    .contracts.filter((c) => c.clientId === clientId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getContract(id: Id): Contract | undefined {
  return getMockStore().contracts.find((c) => c.id === id);
}

export interface CreateContractInput {
  clientId: Id;
  reference: string;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
}

export function createContract(input: CreateContractInput, actor: InternalUser): Contract {
  const store = getMockStore();

  const duplicate = store.contracts.find(
    (c) => c.clientId === input.clientId && c.reference === input.reference,
  );
  if (duplicate) {
    throw new AppError('CONFLICT', 'Já existe um contrato com esta referência para o cliente');
  }

  const contract: Contract = {
    id: generateId(),
    clientId: input.clientId,
    reference: input.reference,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    status: 'ACTIVE',
    notes: input.notes ?? null,
    documents: [],
    createdAt: nowIso(),
  };
  store.contracts.push(contract);

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: 'contract.created',
    targetType: 'contract',
    targetId: contract.id,
    clientId: contract.clientId,
  });

  return contract;
}

export function setContractStatus(id: Id, status: ContractStatus, actor: InternalUser): Contract {
  const contract = getContract(id);
  if (!contract) {
    throw new AppError('NOT_FOUND', 'Contrato não encontrado');
  }

  contract.status = status;

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: 'contract.status_changed',
    targetType: 'contract',
    targetId: contract.id,
    clientId: contract.clientId,
    reason: status,
  });

  return contract;
}

export interface AddContractDocumentInput {
  contractId: Id;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  signedDocument: boolean;
}

export function addContractDocument(input: AddContractDocumentInput, actor: InternalUser) {
  const contract = getContract(input.contractId);
  if (!contract) {
    throw new AppError('NOT_FOUND', 'Contrato não encontrado');
  }

  const document = {
    id: generateId(),
    storagePath: `mock://contract-documents/${input.contractId}/${input.originalName}`,
    originalName: input.originalName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    signedDocument: input.signedDocument,
    uploadedAt: nowIso(),
  };
  contract.documents.push(document);

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: 'contract.document_uploaded',
    targetType: 'contract',
    targetId: contract.id,
    clientId: contract.clientId,
    reason: input.originalName,
  });

  return document;
}

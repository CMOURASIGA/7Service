import 'server-only';

import { generateId, getMockStore, nowIso, todayIso } from '@/lib/mock/store';
import type {
  Client,
  ClientAddress,
  ClientStatus,
  Id,
  InternalUser,
  PersonType,
} from '@/types/domain';

import { writeAudit } from './audit';

/**
 * Service de Clientes (Etapa 3). Ver nota de arquitetura em
 * `src/services/internal-users.ts` sobre a troca futura mock -> Supabase.
 */

export interface ClientFilters {
  search?: string;
  status?: ClientStatus;
}

export function listClients(filters: ClientFilters = {}): Client[] {
  const search = filters.search?.trim().toLowerCase();

  return getMockStore()
    .clients.filter((client) => {
      if (filters.status && client.status !== filters.status) return false;
      if (!search) return true;

      const haystack = [client.legalName, client.tradeName, client.document, client.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    })
    .sort((a, b) => a.legalName.localeCompare(b.legalName));
}

export function getClient(id: Id): Client | undefined {
  return getMockStore().clients.find((c) => c.id === id);
}

export interface ClientInput {
  personType: PersonType;
  document: string;
  legalName: string;
  tradeName?: string | null;
  phone?: string | null;
  email?: string | null;
  contactName?: string | null;
  notes?: string | null;
  address?: ClientAddress | null;
}

function normalizeDocument(document: string): string {
  return document.replace(/\D/g, '');
}

function isValidDocument(personType: PersonType, document: string): boolean {
  const digits = normalizeDocument(document);
  return personType === 'PF' ? digits.length === 11 : digits.length === 14;
}

export function createClient(input: ClientInput, actor: InternalUser): Client {
  if (!isValidDocument(input.personType, input.document)) {
    throw new Error(
      input.personType === 'PF'
        ? 'CPF inválido: deve ter 11 dígitos'
        : 'CNPJ inválido: deve ter 14 dígitos',
    );
  }

  const document = normalizeDocument(input.document);
  const store = getMockStore();

  const duplicate = store.clients.find((c) => c.document === document && c.status !== 'CLOSED');
  if (duplicate) {
    throw new Error('Já existe um cliente ativo com este documento');
  }

  const client: Client = {
    id: generateId(),
    personType: input.personType,
    document,
    legalName: input.legalName,
    tradeName: input.tradeName ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    contactName: input.contactName ?? null,
    status: 'ACTIVE',
    notes: input.notes ?? null,
    relationshipStartDate: todayIso(),
    address: input.address ?? null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  store.clients.push(client);

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: 'client.created',
    targetType: 'client',
    targetId: client.id,
    clientId: client.id,
  });

  return client;
}

export function updateClient(id: Id, input: Partial<ClientInput>, actor: InternalUser): Client {
  const client = getClient(id);
  if (!client) {
    throw new Error('Cliente não encontrado');
  }

  const before = { ...client };

  if (input.personType) client.personType = input.personType;
  if (input.document) client.document = normalizeDocument(input.document);
  if (input.legalName) client.legalName = input.legalName;
  if ('tradeName' in input) client.tradeName = input.tradeName ?? null;
  if ('phone' in input) client.phone = input.phone ?? null;
  if ('email' in input) client.email = input.email ?? null;
  if ('contactName' in input) client.contactName = input.contactName ?? null;
  if ('notes' in input) client.notes = input.notes ?? null;
  if ('address' in input) client.address = input.address ?? null;
  client.updatedAt = nowIso();

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: 'client.updated',
    targetType: 'client',
    targetId: client.id,
    clientId: client.id,
    reason: JSON.stringify({ before: before.legalName, after: client.legalName }),
  });

  return client;
}

export function setClientStatus(
  id: Id,
  status: ClientStatus,
  actor: InternalUser,
  reason?: string,
): Client {
  const client = getClient(id);
  if (!client) {
    throw new Error('Cliente não encontrado');
  }

  client.status = status;
  client.updatedAt = nowIso();

  const actionByStatus: Record<ClientStatus, string> = {
    ACTIVE: 'client.reactivated',
    SUSPENDED: 'client.suspended',
    CLOSED: 'client.closed',
  };

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: actionByStatus[status],
    targetType: 'client',
    targetId: client.id,
    clientId: client.id,
    reason: reason ?? null,
  });

  return client;
}

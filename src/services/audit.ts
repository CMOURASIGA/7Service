import 'server-only';

import { generateId, getMockStore, nowIso } from '@/lib/mock/store';
import type { AuditLog, Id } from '@/types/domain';

/**
 * Service de auditoria (Etapa 12). Escrita apenas via `writeAudit`
 * (nunca exposta para edição/remoção pela UI — docs/01-architecture/AUDIT.md:
 * "usuário comum não altera audit log").
 */

export interface WriteAuditInput {
  actorLabel: string;
  action: string;
  targetType: string;
  targetId?: Id | null;
  clientId?: Id | null;
  productId?: Id | null;
  reason?: string | null;
}

export function writeAudit(input: WriteAuditInput): AuditLog {
  const entry: AuditLog = {
    id: generateId(),
    occurredAt: nowIso(),
    actorLabel: input.actorLabel,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    clientId: input.clientId ?? null,
    productId: input.productId ?? null,
    reason: input.reason ?? null,
    correlationId: generateId(),
  };

  getMockStore().auditLogs.push(entry);
  return entry;
}

export interface AuditFilters {
  clientId?: Id;
  productId?: Id;
  action?: string;
}

export function listAuditLogs(filters: AuditFilters = {}): AuditLog[] {
  return getMockStore()
    .auditLogs.filter((log) => {
      if (filters.clientId && log.clientId !== filters.clientId) return false;
      if (filters.productId && log.productId !== filters.productId) return false;
      if (filters.action && log.action !== filters.action) return false;
      return true;
    })
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
}

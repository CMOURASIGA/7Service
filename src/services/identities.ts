import 'server-only';

import { getMockStore } from '@/lib/mock/store';
import type { Id, Identity } from '@/types/domain';

/**
 * Service de identidades / usuários finais (Etapa 7). Ver nota de
 * arquitetura em `src/services/internal-users.ts`.
 */

export interface IdentityFilters {
  search?: string;
}

export function listIdentities(filters: IdentityFilters = {}): Identity[] {
  const search = filters.search?.trim().toLowerCase();

  return getMockStore()
    .identities.filter((identity) => {
      if (!search) return true;
      const haystack = `${identity.firstName} ${identity.lastName} ${identity.email}`.toLowerCase();
      return haystack.includes(search);
    })
    .sort((a, b) => a.firstName.localeCompare(b.firstName));
}

export function getIdentity(id: Id): Identity | undefined {
  return getMockStore().identities.find((i) => i.id === id);
}

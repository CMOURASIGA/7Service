import 'server-only';

import { generateId, getMockStore, nowIso } from '@/lib/mock/store';
import type {
  Id,
  InternalPermission,
  InternalRole,
  InternalRoleCode,
  InternalUser,
} from '@/types/domain';

import { writeAudit } from './audit';

/**
 * Service de RBAC interno (Etapa 1).
 *
 * Hoje implementado sobre o store mockado (`src/lib/mock/store`). Quando o
 * Supabase for provisionado, cada função aqui passa a consultar
 * `internal_users` / `internal_user_roles` / `internal_role_permissions`
 * reais — a assinatura pública não muda, então as telas que consomem este
 * módulo não precisam ser alteradas.
 */

export function listInternalRoles(): InternalRole[] {
  return getMockStore().internalRoles;
}

export function listInternalPermissions(): InternalPermission[] {
  return getMockStore().internalPermissions;
}

export function getPermissionCodesForRoles(roleCodes: InternalRoleCode[]): Set<string> {
  const store = getMockStore();
  const roleIds = store.internalRoles.filter((r) => roleCodes.includes(r.code)).map((r) => r.id);
  const permissionIds = new Set(
    store.internalRolePermissions
      .filter((rp) => roleIds.includes(rp.roleId))
      .map((rp) => rp.permissionId),
  );
  return new Set(
    store.internalPermissions.filter((p) => permissionIds.has(p.id)).map((p) => p.code),
  );
}

export function userHasPermission(user: InternalUser, permissionCode: string): boolean {
  return getPermissionCodesForRoles(user.roleCodes).has(permissionCode);
}

export function listInternalUsers(): InternalUser[] {
  return [...getMockStore().internalUsers].sort((a, b) => a.firstName.localeCompare(b.firstName));
}

export function getInternalUser(id: Id): InternalUser | undefined {
  return getMockStore().internalUsers.find((u) => u.id === id);
}

/**
 * Retorna o operador interno "logado" em MODO DEMONSTRAÇÃO
 * (docs/config/env.ts - isSupabaseConfigured). Sempre o primeiro
 * SUPER_ADMIN do seed, para que toda a navegação fique acessível sem
 * exigir um fluxo de login real que ainda não existe.
 */
export function getMockCurrentInternalUser(): InternalUser {
  const store = getMockStore();
  const superAdmin = store.internalUsers.find((u) => u.roleCodes.includes('SUPER_ADMIN'));
  return superAdmin ?? store.internalUsers[0];
}

export interface CreateInternalUserInput {
  firstName: string;
  lastName: string;
  email: string;
  roleCodes: InternalRoleCode[];
}

export function createInternalUser(
  input: CreateInternalUserInput,
  actor: InternalUser,
): InternalUser {
  const store = getMockStore();
  const user: InternalUser = {
    id: generateId(),
    authUserId: `mock-auth-${generateId()}`,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    status: 'ACTIVE',
    roleCodes: input.roleCodes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  store.internalUsers.push(user);

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: 'internal_user.created',
    targetType: 'internal_user',
    targetId: user.id,
  });

  return user;
}

export function updateInternalUserRoles(
  id: Id,
  roleCodes: InternalRoleCode[],
  actor: InternalUser,
): InternalUser {
  const store = getMockStore();
  const user = store.internalUsers.find((u) => u.id === id);
  if (!user) {
    throw new Error('Operador interno não encontrado');
  }

  user.roleCodes = roleCodes;
  user.updatedAt = nowIso();

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: 'internal_user.roles_updated',
    targetType: 'internal_user',
    targetId: user.id,
  });

  return user;
}

export function setInternalUserStatus(
  id: Id,
  status: InternalUser['status'],
  actor: InternalUser,
): InternalUser {
  const store = getMockStore();
  const user = store.internalUsers.find((u) => u.id === id);
  if (!user) {
    throw new Error('Operador interno não encontrado');
  }

  user.status = status;
  user.updatedAt = nowIso();

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: status === 'ACTIVE' ? 'internal_user.reactivated' : 'internal_user.blocked',
    targetType: 'internal_user',
    targetId: user.id,
  });

  return user;
}

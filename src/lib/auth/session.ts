import 'server-only';

import { isSupabaseConfigured } from '@/config/env';
import { AppError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import type { InternalRoleCode, InternalUser } from '@/types/domain';

/**
 * Fail-closed internal administration: a Supabase Auth login by itself
 * never grants access to 7Service. An ACTIVE internal_users record and
 * an assigned internal role must both exist.
 */
export interface CurrentSession {
  mode: 'mock' | 'supabase';
  internalUser: InternalUser;
}

export async function getCurrentSession(): Promise<CurrentSession> {
  if (!isSupabaseConfigured()) {
    throw new AppError('FORBIDDEN', 'Banco administrativo não configurado. Acesso indisponível.');
  }
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    throw new AppError('FORBIDDEN', 'Sessão inexistente ou expirada.');
  }
  const { data: operator, error } = await supabase
    .from('internal_users')
    .select('id,auth_user_id,first_name,last_name,email,status,created_at,updated_at')
    .eq('auth_user_id', auth.user.id)
    .eq('status', 'ACTIVE')
    .maybeSingle();
  if (error || !operator) {
    throw new AppError('FORBIDDEN', 'Usuário não autorizado a administrar o 7Service.');
  }
  const { data: assigned, error: roleError } = await supabase
    .from('internal_user_roles')
    .select('internal_roles(code)')
    .eq('internal_user_id', operator.id);
  if (roleError || !assigned || assigned.length === 0) {
    throw new AppError('FORBIDDEN', 'Operador sem perfil administrativo autorizado.');
  }
  const roleCodes = assigned.flatMap((entry) => {
    const role = entry.internal_roles as unknown as { code: InternalRoleCode } | null;
    return role ? [role.code] : [];
  });
  return {
    mode: 'supabase',
    internalUser: {
      id: operator.id,
      authUserId: operator.auth_user_id,
      firstName: operator.first_name,
      lastName: operator.last_name,
      email: operator.email,
      status: 'ACTIVE',
      roleCodes,
      createdAt: operator.created_at,
      updatedAt: operator.updated_at,
    },
  };
}

export async function requirePermission(permissionCode: string): Promise<CurrentSession> {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const { data: roles, error: rolesError } = await supabase
    .from('internal_roles')
    .select('id')
    .in('code', session.internalUser.roleCodes);
  if (rolesError || !roles?.length) throw new AppError('FORBIDDEN', 'Permissão negada.');
  const { data: assigned, error: assignedError } = await supabase
    .from('internal_role_permissions')
    .select('internal_permissions(code)')
    .in('role_id', roles.map((role) => role.id));
  if (assignedError || !assigned?.some((row) => {
    const permission = row.internal_permissions as unknown as { code: string } | null;
    return permission?.code === permissionCode;
  })) throw new AppError('FORBIDDEN', 'Permissão negada: ' + permissionCode);
  return session;
}

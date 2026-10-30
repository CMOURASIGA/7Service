import 'server-only';

import { AppError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Fail-closed check for privileged administrative operations.
 * Never trust a role supplied in user input or editable user metadata.
 */
export async function requireInternalAdmin(): Promise<string> {
  const sessionClient = await createClient();
  const { data: auth, error: authError } = await sessionClient.auth.getUser();
  if (authError || !auth.user) throw new AppError('UNAUTHENTICATED', 'Sessão necessária');

  const admin = createAdminClient();
  const { data: internal, error: internalError } = await admin
    .from('internal_users')
    .select('id,status')
    .eq('auth_user_id', auth.user.id)
    .single();
  if (internalError || !internal || internal.status !== 'ACTIVE') {
    throw new AppError('FORBIDDEN', 'Operador interno não autorizado');
  }

  const { data: memberships, error: membershipError } = await admin
    .from('internal_user_roles')
    .select('role_id')
    .eq('internal_user_id', internal.id);
  if (membershipError || !memberships?.length)
    throw new AppError('FORBIDDEN', 'Perfil administrativo ausente');

  const { data: roles, error: rolesError } = await admin
    .from('internal_roles')
    .select('id,code')
    .in(
      'id',
      memberships.map((item) => item.role_id),
    );
  if (
    rolesError ||
    !roles?.some((role) => role.code === 'SUPER_ADMIN' || role.code === 'OPERATIONS_ADMIN')
  ) {
    throw new AppError('FORBIDDEN', 'Permissão administrativa insuficiente');
  }
  return internal.id;
}

import 'server-only';

import { isSupabaseConfigured } from '@/config/env';
import { AppError } from '@/lib/errors';
import { getMockCurrentInternalUser, userHasPermission } from '@/services/internal-users';
import type { InternalUser } from '@/types/domain';

/**
 * Sessão administrativa atual do 7Service.
 *
 * `mode: 'mock'` enquanto não houver projeto Supabase configurado
 * (docs/MIGRATIONS.md - "Estado atual"): toda a navegação funciona sem
 * exigir login real, sempre como o SUPER_ADMIN de demonstração. Isso é
 * INTENCIONAL e temporário — nunca deve ser interpretado como o
 * comportamento final de autorização (docs/01-architecture/AUTHORIZATION.md
 * - "Backend como autoridade" continua valendo: esta função concentra a
 * decisão para o resto do app não precisar saber qual modo está ativo).
 *
 * Quando `isSupabaseConfigured()` passar a `true`, este é o único lugar
 * que precisa ganhar a implementação real (ler `auth.getUser()` e
 * carregar o `internal_users` correspondente).
 */
export interface CurrentSession {
  mode: 'mock' | 'supabase';
  internalUser: InternalUser;
}

export async function getCurrentSession(): Promise<CurrentSession> {
  if (isSupabaseConfigured()) {
    // TODO(Supabase): substituir por auth.getUser() + lookup em
    // internal_users assim que o projeto for provisionado (Etapa 1 real).
    // Até lá, mesmo com envs presentes, seguimos em modo demonstração para
    // não quebrar a navegação com um projeto ainda vazio.
  }

  return {
    mode: 'mock',
    internalUser: getMockCurrentInternalUser(),
  };
}

export async function requirePermission(permissionCode: string): Promise<CurrentSession> {
  const session = await getCurrentSession();

  if (!userHasPermission(session.internalUser, permissionCode)) {
    throw new AppError('FORBIDDEN', `Permissão negada: ${permissionCode}`);
  }

  return session;
}

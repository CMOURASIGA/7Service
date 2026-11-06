import 'server-only';

import { isSupabaseConfigured } from '@/config/env';
import { AppError } from '@/lib/errors';
import { getMockStore } from '@/lib/mock/store';
import type { Id, InternalUser } from '@/types/domain';

import { writeAudit } from './audit';

/**
 * Recuperação de acesso (Etapa 10).
 *
 * O 7Service inicia o fluxo mas nunca conhece nem exibe a senha atual
 * (docs/01-architecture/AUTHENTICATION.md - "Recuperação"). Quem gera o
 * token seguro é o provedor de autenticação.
 *
 * Em modo demonstração não há Supabase Auth real para acionar — a ação
 * fica registrada na auditoria (comportamento observável e correto), mas
 * nenhum e-mail é de fato disparado. Quando `isSupabaseConfigured()`
 * passar a `true`, este é o único lugar que precisa chamar
 * `supabase.auth.resetPasswordForEmail(...)` de verdade.
 */
export function initiateRecovery(identityId: Id, actor: InternalUser) {
  const store = getMockStore();
  const identity = store.identities.find((i) => i.id === identityId);
  if (!identity) {
    throw new AppError('NOT_FOUND', 'Usuário não encontrado');
  }
  if (identity.status !== 'ACTIVE') {
    throw new AppError(
      'VALIDATION_ERROR',
      'Recuperação só pode ser iniciada para usuário com identidade ATIVA',
    );
  }

  if (isSupabaseConfigured()) {
    // TODO(Supabase): supabase.auth.resetPasswordForEmail(identity.email, ...)
  }

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: 'recovery.initiated',
    targetType: 'identity',
    targetId: identity.id,
    clientId: identity.clientId,
  });

  return { initiatedAt: new Date().toISOString(), demoMode: !isSupabaseConfigured() };
}

import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { AppError } from '@/lib/errors';

/** Persist a scoped administrative action. Never include credentials or raw file content. */
export async function recordAdminEvent(input: {
  actorInternalUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  clientId?: string | null;
  productId?: string | null;
  reason?: string | null;
}): Promise<void> {
  const { error } = await createAdminClient().from('audit_logs').insert({
    source: '7service',
    actor_internal_user_id: input.actorInternalUserId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    client_id: input.clientId ?? null,
    product_id: input.productId ?? null,
    reason: input.reason ?? null,
    metadata_safe: {},
  });
  if (error) throw new AppError('UNEXPECTED_ERROR', 'Falha ao registrar auditoria administrativa');
}

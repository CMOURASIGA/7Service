'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncCommanderRevocation } from '@/lib/integrations/commander-revocation';

export async function setMembershipStatusAction(
  identityId: string,
  membershipId: string,
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED',
  form: FormData,
) {
  const { internalUser } = await requirePermission('users.manage');
  const reason = String(form.get('reason') ?? '').trim();
  if (status !== 'ACTIVE' && reason.length < 5)
    throw new Error('Justificativa obrigatória com ao menos 5 caracteres.');
  const db = createAdminClient();
  const { data: previous, error: readError } = await db
    .from('client_memberships')
    .select('id,client_id,status')
    .eq('id', membershipId)
    .eq('identity_id', identityId)
    .maybeSingle();
  if (readError || !previous) throw new Error('Vínculo empresarial não encontrado.');
  if (previous.status !== status) {
    const { data: updated, error } = await db
      .from('client_memberships')
      .update({ status })
      .eq('id', membershipId)
      .eq('status', previous.status)
      .select('id')
      .single();
    if (error || !updated)
      throw new Error('O vínculo foi alterado por outro operador. Recarregue a tela.');
    const { error: auditError } = await db.from('audit_logs').insert({
      actor_internal_user_id: internalUser.id,
      action: 'membership.' + status.toLowerCase(),
      target_type: 'client_membership',
      target_id: membershipId,
      client_id: previous.client_id,
      before_json: { status: previous.status },
      after_json: { status },
      reason: reason || null,
      source: '7service',
    });
    if (auditError) throw new Error('Vínculo atualizado, mas registro de auditoria indisponível.');
  }
  revalidatePath('/usuarios/' + identityId);
  revalidatePath('/clientes/' + previous.client_id);
  if (status !== 'ACTIVE') {
    const product = await db.from('products').select('id').eq('code', 'COMMANDER7').maybeSingle();
    if (product.error)
      throw new Error('Vínculo central atualizado. Verificação do Commander pendente.');
    if (!product.data) return;
    const subscriptions = await db
      .from('subscriptions')
      .select('id')
      .eq('client_id', previous.client_id)
      .eq('product_id', product.data.id);
    if (subscriptions.error)
      throw new Error('Vínculo central atualizado. Verificação do Commander pendente.');
    const ids = (subscriptions.data ?? []).map((item) => item.id);
    if (!ids.length) return;
    const grants = await db
      .from('user_product_access')
      .select('id')
      .eq('identity_id', identityId)
      .eq('client_id', previous.client_id)
      .in('subscription_id', ids)
      .limit(1);
    if (grants.error)
      throw new Error('Vínculo central atualizado. Verificação do Commander pendente.');
    if (!grants.data?.length) return;
    const sync = await syncCommanderRevocation({
      identityId,
      clientId: previous.client_id,
      productCode: 'COMMANDER7',
    });
    if (!sync.confirmed) {
      // The central authorization already denies access, but remote readback is pending.
      throw new Error(
        'Vínculo central atualizado. Revogação no Commander pendente de confirmação.',
      );
    }
  }
}

/**
 * Operator-driven retry when the central change succeeded but the destination
 * was offline. Never suspend a Commander member while central access is valid.
 */
export async function retryCommanderRevocationAction(
  identityId: string,
  clientId: string,
  _form: FormData,
): Promise<{ error: string | null; success?: string }> {
  await requirePermission('users.access.manage');
  const db = createAdminClient();
  const membership = await db
    .from('client_memberships')
    .select('status')
    .eq('identity_id', identityId)
    .eq('client_id', clientId)
    .maybeSingle();
  if (membership.error || !membership.data) {
    return { error: 'Vínculo central não encontrado. Nenhuma alteração foi executada.' };
  }
  if (membership.data.status === 'ACTIVE') {
    const product = await db.from('products').select('id').eq('code', 'COMMANDER7').maybeSingle();
    if (product.error || !product.data)
      return { error: 'Não foi possível verificar o produto Commander.' };
    const subscriptions = await db
      .from('subscriptions')
      .select('id')
      .eq('client_id', clientId)
      .eq('product_id', product.data.id);
    if (subscriptions.error)
      return { error: 'Não foi possível verificar as assinaturas do Commander.' };
    const ids = (subscriptions.data ?? []).map((item) => item.id);
    if (ids.length) {
      const stillActive = await db
        .from('user_product_access')
        .select('id')
        .eq('identity_id', identityId)
        .eq('client_id', clientId)
        .eq('status', 'ACTIVE')
        .in('subscription_id', ids)
        .limit(1);
      if (stillActive.error)
        return { error: 'Não foi possível verificar as concessões existentes.' };
      if (stillActive.data?.length)
        return {
          error:
            'Acesso central ainda ativo. A suspensão remota foi impedida para proteger outras concessões.',
        };
    }
  }
  const sync = await syncCommanderRevocation({
    identityId,
    clientId,
    productCode: 'COMMANDER7',
  });
  if (!sync.confirmed) {
    const feedback: Record<typeof sync.reason, string> = {
      NOT_CONFIGURED: 'Integração não configurada. Suspensão remota não confirmada.',
      DESTINATION_PROTECTED: 'Proteção da Preview impediu resposta JSON. Verifique o bypass na Vercel.',
      DESTINATION_REJECTED: 'Destino rejeitou a solicitação. Verifique HMAC, vínculos e auditoria.',
      DESTINATION_UNAVAILABLE: 'Commander indisponível. Verifique URL, rede e timeout.',
      UNCONFIRMED: 'Commander respondeu sem confirmar o bloqueio.',
    };
    return {
      error: 'A revogação central permanece efetiva. ' + feedback[sync.reason],
    };
  }
  revalidatePath('/usuarios/' + identityId);
  return { error: null, success: 'Suspensão confirmada no Commander.' };
}

'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function setExclusiveFeatureAction(
  clientId: string,
  featureId: string,
  enabled: boolean,
  form: FormData,
) {
  const { internalUser } = await requirePermission('products.manage');
  const reason = String(form.get('reason') ?? '').trim();
  if (reason.length < 10) throw new Error('Informe uma justificativa de ao menos 10 caracteres.');
  const db = createAdminClient();
  const { data: feature, error: featureError } = await db
    .from('product_features')
    .select('id,product_id,status')
    .eq('id', featureId)
    .maybeSingle();
  if (featureError || !feature || feature.status !== 'ACTIVE')
    throw new Error('Funcionalidade não encontrada.');
  const { data: subscriptions, error: subscriptionError } = await db
    .from('subscriptions')
    .select('id,status,start_date,end_date,grace_days')
    .eq('client_id', clientId)
    .eq('product_id', feature.product_id);
  if (subscriptionError) throw new Error('Falha ao consultar contrato.');
  const today = new Date().toISOString().slice(0, 10);
  const contracted = (subscriptions ?? []).some(
    (s) =>
      s.status === 'ACTIVE' &&
      s.start_date <= today &&
      (!s.end_date ||
        Date.parse(today + 'T00:00:00Z') <=
          Date.parse(s.end_date + 'T00:00:00Z') + s.grace_days * 86400000),
  );
  if (enabled && !contracted)
    throw new Error('Não é possível ativar funcionalidade sem assinatura vigente.');
  const { data: existing, error: readError } = await db
    .from('client_feature_flags')
    .select('id,enabled')
    .eq('client_id', clientId)
    .eq('feature_id', featureId)
    .maybeSingle();
  if (readError) throw new Error('Falha ao consultar configuração atual.');
  const { data: updated, error } = await db
    .from('client_feature_flags')
    .upsert(
      {
        client_id: clientId,
        feature_id: featureId,
        enabled,
        reason,
        changed_by: internalUser.id,
      },
      { onConflict: 'client_id,feature_id' },
    )
    .select('id')
    .single();
  if (error || !updated) throw new Error('Não foi possível registrar a funcionalidade.');
  const { error: auditError } = await db.from('audit_logs').insert({
    actor_internal_user_id: internalUser.id,
    action: enabled ? 'feature.client_enabled' : 'feature.client_disabled',
    target_type: 'client_feature_flag',
    target_id: updated.id,
    client_id: clientId,
    product_id: feature.product_id,
    before_json: { enabled: existing?.enabled ?? null },
    after_json: { enabled },
    reason,
    source: '7service',
  });
  if (auditError) throw new Error('Configuração alterada, mas auditoria indisponível.');
  revalidatePath('/clientes/' + clientId);
}

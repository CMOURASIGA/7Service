'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export interface SupportFormState {
  error: string | null;
  success?: string;
}

export async function createIncidentAction(
  _previous: SupportFormState,
  form: FormData,
): Promise<SupportFormState> {
  const { internalUser } = await requirePermission('support.manage');
  const clientId = String(form.get('clientId') ?? '');
  const productId = String(form.get('productId') ?? '') || null;
  const environmentId = String(form.get('environmentId') ?? '') || null;
  const title = String(form.get('title') ?? '').trim();
  const description = String(form.get('description') ?? '').trim() || null;
  const severity = String(form.get('severity') ?? 'MEDIUM');
  if (
    !/^[0-9a-f-]{36}$/i.test(clientId) ||
    title.length < 5 ||
    title.length > 180 ||
    !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)
  )
    return { error: 'Informe cliente, título e criticidade válidos.' };
  const db = createAdminClient();
  const { data: client, error: clientError } = await db
    .from('clients')
    .select('id,status')
    .eq('id', clientId)
    .maybeSingle();
  if (clientError || !client) return { error: 'Cliente não encontrado.' };
  if (productId) {
    const { data: product, error } = await db
      .from('products')
      .select('id')
      .eq('id', productId)
      .maybeSingle();
    if (error || !product) return { error: 'Produto inválido.' };
  }
  const { data: incident, error } = await db
    .from('support_incidents')
    .insert({
      client_id: clientId,
      product_id: productId,
      environment_id: environmentId,
      title,
      description,
      severity,
      created_by: internalUser.id,
      status: 'OPEN',
    })
    .select('id')
    .single();
  if (error || !incident)
    return { error: error?.message ?? 'Não foi possível registrar incidente.' };
  const { error: auditError } = await db.from('audit_logs').insert({
    actor_internal_user_id: internalUser.id,
    action: 'support.incident_created',
    target_type: 'support_incident',
    target_id: incident.id,
    client_id: clientId,
    product_id: productId,
    reason: title,
    source: '7service',
  });
  if (auditError) return { error: 'Incidente registrado, mas auditoria não confirmada.' };
  revalidatePath('/suporte');
  return { error: null, success: 'Incidente de suporte registrado.' };
}

export async function updateIncidentStatusAction(
  incidentId: string,
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED',
  form: FormData,
) {
  const { internalUser } = await requirePermission('support.manage');
  const reason = String(form.get('reason') ?? '').trim();
  if (reason.length < 5) throw new Error('Informe uma justificativa com pelo menos 5 caracteres.');
  const db = createAdminClient();
  const { data: previous, error: readError } = await db
    .from('support_incidents')
    .select('id,client_id,product_id,status')
    .eq('id', incidentId)
    .maybeSingle();
  if (readError || !previous) throw new Error('Incidente não encontrado.');
  if (previous.status === status) return;
  const { data: changed, error } = await db
    .from('support_incidents')
    .update({
      status,
      resolved_at: status === 'RESOLVED' || status === 'CLOSED' ? new Date().toISOString() : null,
    })
    .eq('id', incidentId)
    .eq('status', previous.status)
    .select('id')
    .single();
  if (error || !changed) throw new Error('Incidente foi modificado por outro operador.');
  const { error: auditError } = await db.from('audit_logs').insert({
    actor_internal_user_id: internalUser.id,
    action: 'support.status_changed',
    target_type: 'support_incident',
    target_id: incidentId,
    client_id: previous.client_id,
    product_id: previous.product_id,
    before_json: { status: previous.status },
    after_json: { status },
    reason,
    source: '7service',
  });
  if (auditError) throw new Error('Incidente atualizado, auditoria indisponível.');
  revalidatePath('/suporte');
}

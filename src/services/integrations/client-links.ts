import 'server-only';
import { requireInternalAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAdminEvent } from '@/lib/audit/record-admin-event';
import { AppError } from '@/lib/errors';
import type { IntegratedProduct } from './product-entitlements';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function listClientIntegrationLinks(clientId: string) {
  await requireInternalAdmin();
  if (!uuid.test(clientId)) throw new AppError('VALIDATION_ERROR', 'Cliente inválido');
  const { data, error } = await createAdminClient()
    .from('client_integration_links')
    .select('id,client_id,product_code,external_tenant_id,status,updated_at')
    .eq('client_id', clientId)
    .order('product_code');
  if (error) throw new AppError('UNEXPECTED_ERROR', 'Falha ao consultar vínculos');
  return data ?? [];
}

export async function upsertClientIntegrationLink(input: {
  clientId: string;
  product: IntegratedProduct;
  externalTenantId: string;
  status: 'ACTIVE' | 'DISABLED';
}) {
  const actor = await requireInternalAdmin();
  if (
    !uuid.test(input.clientId) ||
    !['7COMMANDER', '7CLINIC'].includes(input.product) ||
    !['ACTIVE', 'DISABLED'].includes(input.status) ||
    input.externalTenantId !== input.externalTenantId.trim() ||
    input.externalTenantId.length < 1 ||
    input.externalTenantId.length > 200
  ) {
    throw new AppError('VALIDATION_ERROR', 'Vínculo de integração inválido');
  }
  const db = createAdminClient();
  const { data: client, error: clientError } = await db
    .from('clients')
    .select('id,status')
    .eq('id', input.clientId)
    .single();
  if (clientError || !client) throw new AppError('NOT_FOUND', 'Cliente não encontrado');
  if (input.status === 'ACTIVE' && client.status !== 'ACTIVE')
    throw new AppError('CONFLICT', 'Cliente inativo não pode ativar integração');
  const { data, error } = await db
    .from('client_integration_links')
    .upsert(
      {
        client_id: input.clientId,
        product_code: input.product,
        external_tenant_id: input.externalTenantId,
        status: input.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,product_code' },
    )
    .select('id,client_id,product_code,external_tenant_id,status')
    .single();
  if (error?.code === '23505')
    throw new AppError('CONFLICT', 'Tenant já vinculado a outro cliente');
  if (error || !data) throw new AppError('UNEXPECTED_ERROR', 'Falha ao salvar vínculo');
  await recordAdminEvent({
    actorInternalUserId: actor,
    action: 'integration.tenant_link_updated',
    targetType: 'client_integration_link',
    targetId: data.id,
    clientId: input.clientId,
    reason: input.product + ':' + input.status,
  });
  return data;
}

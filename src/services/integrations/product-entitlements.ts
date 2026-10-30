import 'server-only';

import { requireInternalAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { AppError } from '@/lib/errors';

export type IntegratedProduct = '7COMMANDER' | '7CLINIC';

export interface ProductEntitlement {
  clientId: string;
  product: IntegratedProduct;
  subscriptionId: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  licenseLimit: number;
  validUntil: string | null;
}

/**
 * Internal 7Service query for the Consult administration panel.
 * This is NOT an external API authentication mechanism: neither 7Commander
 * nor 7Clinic may trust a clientId from the browser as proof of tenancy.
 */
export async function getProductEntitlement(
  clientId: string,
  productCode: IntegratedProduct,
): Promise<ProductEntitlement> {
  await requireInternalAdmin();
  return readProductEntitlement(clientId, productCode);
}

/** Internal-only read used after an independently verified machine identity. */
export async function readProductEntitlement(
  clientId: string,
  productCode: IntegratedProduct,
): Promise<ProductEntitlement> {
  const db = createAdminClient();
  const { data: client, error: clientError } = await db
    .from('clients')
    .select('id,status')
    .eq('id', clientId)
    .single();
  if (clientError || !client) throw new AppError('NOT_FOUND', 'Cliente não encontrado');
  const { data: product, error: productError } = await db
    .from('products')
    .select('id,code,status')
    .eq('code', productCode)
    .single();
  if (productError || !product) throw new AppError('NOT_FOUND', 'Produto não cadastrado');
  const { data: subscriptions, error } = await db
    .from('subscriptions')
    .select('id,status,start_date,end_date,license_limit')
    .eq('client_id', clientId)
    .eq('product_id', product.id)
    .order('start_date', { ascending: false });
  if (error) throw new AppError('UNEXPECTED_ERROR', 'Erro ao consultar assinatura');
  const today = new Date().toISOString().slice(0, 10);
  const eligible = (subscriptions ?? []).find(
    (item) =>
      item.status === 'ACTIVE' &&
      item.start_date <= today &&
      (item.end_date === null || item.end_date >= today),
  );
  const latest = eligible ?? subscriptions?.[0] ?? null;
  const { data: link, error: linkError } = await db
    .from('client_integration_links')
    .select('status')
    .eq('client_id', clientId)
    .eq('product_code', productCode)
    .maybeSingle();
  if (linkError) throw new AppError('UNEXPECTED_ERROR', 'Erro ao consultar vínculo externo');
  const active = Boolean(
    eligible &&
    link?.status === 'ACTIVE' &&
    client.status === 'ACTIVE' &&
    product.status === 'ACTIVE',
  );
  let extraLicenses = 0;
  if (active && eligible) {
    const { data: overrides, error: overrideError } = await db
      .from('license_overrides')
      .select('extra_licenses')
      .eq('subscription_id', eligible.id);
    if (overrideError)
      throw new AppError('UNEXPECTED_ERROR', 'Erro ao consultar licenças adicionais');
    extraLicenses = (overrides ?? []).reduce((sum, item) => sum + item.extra_licenses, 0);
  }
  return {
    clientId,
    product: productCode,
    subscriptionId: latest?.id ?? null,
    status: active
      ? 'ACTIVE'
      : latest?.end_date && latest.end_date < today
        ? 'EXPIRED'
        : 'INACTIVE',
    licenseLimit: active && eligible ? Math.max(0, eligible.license_limit + extraLicenses) : 0,
    validUntil: latest?.end_date ?? null,
  };
}

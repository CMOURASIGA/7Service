import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  tokenMatches,
  productFromPath,
  machineProductSecret,
} from '@/lib/integrations/machine-auth';
import {
  readProductEntitlement,
  type IntegratedProduct,
} from '@/services/integrations/product-entitlements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ productCode: string; externalTenantId: string }> };

/**
 * Machine-to-machine integration contract. Each product has a distinct token.
 * Never accept a clientId supplied by the caller: resolve it from the
 * immutable product + external tenant mapping.
 */
export async function GET(request: Request, context: Context) {
  const { productCode, externalTenantId } = await context.params;
  const product = productFromPath(productCode);
  if (!product) {
    return NextResponse.json({ error: 'Unknown product' }, { status: 404 });
  }
  const secret = machineProductSecret(product);
  if (!tokenMatches(request.headers.get('authorization'), secret)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (
    !externalTenantId ||
    externalTenantId.length > 200 ||
    /[\x00-\x1f\x7f]/.test(externalTenantId)
  ) {
    return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 });
  }
  const db = createAdminClient();
  const { data: link, error } = await db
    .from('client_integration_links')
    .select('client_id,status')
    .eq('product_code', product)
    .eq('external_tenant_id', externalTenantId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Lookup unavailable' }, { status: 503 });
  if (!link || link.status !== 'ACTIVE') {
    return NextResponse.json(
      { status: 'INACTIVE', licenseLimit: 0 },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
  try {
    const result = await readProductEntitlement(link.client_id, product as IntegratedProduct);
    return NextResponse.json(
      {
        product: result.product,
        externalTenantId,
        subscriptionId: result.subscriptionId,
        status: result.status,
        licenseLimit: result.licenseLimit,
        validUntil: result.validUntil,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'Entitlement unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

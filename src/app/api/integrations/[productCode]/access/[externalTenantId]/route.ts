import { NextResponse } from 'next/server';

import { tokenMatches, productFromPath, machineProductSecret } from '@/lib/integrations/machine-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { readProductEntitlement } from '@/services/integrations/product-entitlements';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ productCode: string; externalTenantId: string }> };

function decision(allowed: boolean, roleCodes: string[] = []) {
  return NextResponse.json(
    { allowed, roleCodes },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

/**
 * Called by the product backend AFTER verifying its own local Auth user.
 * Product-token possession alone never authorizes a person.
 * Do not call directly from the browser or accept an unverified email.
 */
export async function POST(request: Request, context: Context) {
  const { productCode, externalTenantId } = await context.params;
  const product = productFromPath(productCode);
  if (!product) return NextResponse.json({ error: 'Unknown product' }, { status: 404 });
  if (!tokenMatches(request.headers.get('authorization'), machineProductSecret(product))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (
    !externalTenantId ||
    externalTenantId.length > 200 ||
    /[\x00-\x1f\x7f]/.test(externalTenantId)
  ) return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const email = body && typeof body === 'object' &&
    'verifiedEmail' in body && typeof body.verifiedEmail === 'string'
      ? body.verifiedEmail.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid verified identity' }, { status: 400 });
  }

  const db = createAdminClient();
  try {
    const { data: link, error: linkError } = await db.from('client_integration_links')
      .select('client_id,status')
      .eq('product_code', product)
      .eq('external_tenant_id', externalTenantId).maybeSingle();
    if (linkError) throw linkError;
    if (!link || link.status !== 'ACTIVE') return decision(false);

    const entitlement = await readProductEntitlement(link.client_id, product);
    if (entitlement.status !== 'ACTIVE' || !entitlement.subscriptionId) {
      return decision(false);
    }
    const { data: identity, error: identityError } = await db.from('identities')
      .select('id,status').eq('email', email).maybeSingle();
    if (identityError) throw identityError;
    if (!identity || identity.status !== 'ACTIVE') return decision(false);
    const { data: membership, error: membershipError } = await db.from('client_memberships')
      .select('id').eq('identity_id', identity.id)
      .eq('client_id', link.client_id).eq('status', 'ACTIVE').maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return decision(false);

    const today = new Date().toISOString().slice(0, 10);
    const { data: accesses, error: accessError } = await db.from('user_product_access')
      .select('product_role_id,valid_from,valid_until')
      .eq('identity_id', identity.id)
      .eq('client_id', link.client_id)
      .eq('membership_id', membership.id)
      .eq('subscription_id', entitlement.subscriptionId)
      .eq('status', 'ACTIVE');
    if (accessError) throw accessError;
    const active = (accesses ?? []).filter((access) =>
      (!access.valid_from || access.valid_from <= today) &&
      (!access.valid_until || access.valid_until >= today));
    if (!active.length) return decision(false);

    const { data: roles, error: roleError } = await db.from('product_roles')
      .select('id,code').eq('status', 'ACTIVE')
      .in('id', active.map((access) => access.product_role_id));
    if (roleError) throw roleError;
    const roleCodes = [...new Set((roles ?? []).map((role) => role.code))];
    return decision(roleCodes.length > 0, roleCodes);
  } catch {
    return NextResponse.json(
      { error: 'Authorization unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

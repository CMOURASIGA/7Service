import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Real administrative KPIs. Caller MUST authorize the operator first.
 * Limited datasets until pagination/aggregation endpoints are introduced.
 */
export async function getDashboardKpis() {
  const db = createAdminClient();
  const [clients, identities, invitations, subscriptions, accesses, products, memberships] =
    await Promise.all([
      db.from('clients').select('id,status'),
      db.from('identities').select('id,status'),
      db.from('invitations').select('id,identity_id,status,expires_at'),
      db
        .from('subscriptions')
        .select('id,client_id,product_id,status,license_limit,end_date,grace_days'),
      db.from('user_product_access').select('id,subscription_id,status'),
      db
        .from('products')
        .select('id,name,code,status,entry_url,login_url,logo_path,description,created_at'),
      db.from('client_memberships').select('identity_id,client_id,status'),
    ]);
  for (const result of [
    clients,
    identities,
    invitations,
    subscriptions,
    accesses,
    products,
    memberships,
  ]) {
    if (result.error) throw new Error('Erro ao consultar indicadores administrativos.');
  }
  const c = clients.data ?? [];
  const ids = identities.data ?? [];
  const activeClientIds = new Set(
    (clients.data ?? []).filter((c) => c.status === 'ACTIVE').map((c) => c.id),
  );
  const activeProductIds = new Set(
    (products.data ?? []).filter((p) => p.status === 'ACTIVE').map((p) => p.id),
  );
  const activeIdentityIds = new Set(
    (identities.data ?? [])
      .filter((i) => i.status === 'ACTIVE' || i.status === 'PENDING_INVITE')
      .map((i) => i.id),
  );
  const currentIdentityIds = new Set(
    (memberships.data ?? [])
      .filter(
        (m) =>
          activeClientIds.has(m.client_id) &&
          ['ACTIVE', 'PENDING'].includes(m.status) &&
          activeIdentityIds.has(m.identity_id),
      )
      .map((m) => m.identity_id),
  );
  const invitationsData = (invitations.data ?? []).filter((i) =>
    currentIdentityIds.has(i.identity_id),
  );
  const subs = (subscriptions.data ?? []).filter(
    (s) =>
      s.status === 'ACTIVE' &&
      activeClientIds.has(s.client_id) &&
      activeProductIds.has(s.product_id),
  );
  const activeSubscriptionIds = new Set(subs.map((s) => s.id));
  const users = (accesses.data ?? []).filter((a) => activeSubscriptionIds.has(a.subscription_id));
  const now = Date.now();
  const day = 86400000;
  const effective = (s: (typeof subs)[number]) => {
    if (s.status !== 'ACTIVE') return s.status;
    if (!s.end_date) return 'ACTIVE';
    const end = Date.parse(s.end_date + 'T23:59:59Z');
    if (now <= end) return 'ACTIVE';
    return now <= end + (s.grace_days ?? 0) * day ? 'GRACE_PERIOD' : 'BLOCKED';
  };
  return {
    activeClients: c.filter((x) => x.status === 'ACTIVE').length,
    suspendedClients: c.filter((x) => x.status === 'SUSPENDED').length,
    activeIdentities: ids.filter((x) => x.status === 'ACTIVE').length,
    pendingInvitations: invitationsData.filter(
      (x) => ['PENDING', 'SENT'].includes(x.status) && Date.parse(x.expires_at) > now,
    ).length,
    expiredInvitations: invitationsData.filter(
      (x) =>
        x.status === 'EXPIRED' ||
        (['PENDING', 'SENT'].includes(x.status) && Date.parse(x.expires_at) <= now),
    ).length,
    licenseLimitTotal: subs.reduce((total, x) => total + x.license_limit, 0),
    licenseUsedTotal: users.filter((x) => ['ACTIVE', 'PENDING'].includes(x.status)).length,
    graceCount: subs.filter((x) => effective(x) === 'GRACE_PERIOD').length,
    blockedCount: subs.filter((x) => effective(x) === 'BLOCKED').length,
    byProduct: (products.data ?? [])
      .filter((p) => p.status === 'ACTIVE')
      .map((p) => ({
        product: p,
        subscriptions: subs.filter((s) => s.product_id === p.id).length,
      })),
  };
}

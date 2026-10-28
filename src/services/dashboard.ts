import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Real administrative KPIs. Caller MUST authorize the operator first.
 * Limited datasets until pagination/aggregation endpoints are introduced.
 */
export async function getDashboardKpis() {
  const db = createAdminClient();
  const [clients, identities, invitations, subscriptions, accesses, products] = await Promise.all([
    db.from('clients').select('id,status'),
    db.from('identities').select('id,status'),
    db.from('invitations').select('id,status,expires_at'),
    db.from('subscriptions').select('id,product_id,status,license_limit,end_date,grace_days'),
    db.from('user_product_access').select('id,status'),
    db.from('products').select('id,name,code,status,entry_url,login_url,logo_path,description,created_at'),
  ]);
  for (const result of [clients, identities, invitations, subscriptions, accesses, products]) {
    if (result.error) throw new Error('Erro ao consultar indicadores administrativos.');
  }
  const c = clients.data ?? [];
  const ids = identities.data ?? [];
  const invitationsData = invitations.data ?? [];
  const subs = subscriptions.data ?? [];
  const users = accesses.data ?? [];
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
    activeClients: c.filter(x => x.status === 'ACTIVE').length,
    suspendedClients: c.filter(x => x.status === 'SUSPENDED').length,
    activeIdentities: ids.filter(x => x.status === 'ACTIVE').length,
    pendingInvitations: invitationsData.filter(x => ['PENDING','SENT'].includes(x.status) && Date.parse(x.expires_at) > now).length,
    expiredInvitations: invitationsData.filter(x => x.status === 'EXPIRED' || (['PENDING','SENT'].includes(x.status) && Date.parse(x.expires_at) <= now)).length,
    licenseLimitTotal: subs.reduce((total, x) => total + x.license_limit, 0),
    licenseUsedTotal: users.filter(x => ['ACTIVE','PENDING'].includes(x.status)).length,
    graceCount: subs.filter(x => effective(x) === 'GRACE_PERIOD').length,
    blockedCount: subs.filter(x => effective(x) === 'BLOCKED').length,
    byProduct: (products.data ?? []).map(p => ({
      product: p,
      subscriptions: subs.filter(s => s.product_id === p.id).length,
    })),
  };
}

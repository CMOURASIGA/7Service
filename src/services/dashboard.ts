import 'server-only';

import { getSubscriptionEffectiveStatus } from '@/lib/domain-rules';
import { getMockStore } from '@/lib/mock/store';

/**
 * KPIs do dashboard (Etapa 13). Derivados diretamente dos domínios reais
 * (mock hoje, Supabase amanhã) — nunca números fixos no frontend
 * (docs/DEV_IMPLEMENTATION_PLAN.md - Etapa 13, "sem dados mockados como
 * implementação final"; aqui o mock É a fundação temporária declarada ao
 * usuário via banner, não um número inventado na tela).
 */
export function getDashboardKpis() {
  const store = getMockStore();

  const activeClients = store.clients.filter((c) => c.status === 'ACTIVE').length;
  const suspendedClients = store.clients.filter((c) => c.status === 'SUSPENDED').length;
  const activeIdentities = store.identities.filter((i) => i.status === 'ACTIVE').length;
  const pendingInvitations = store.invitations.filter(
    (i) => i.status === 'SENT' || i.status === 'PENDING',
  ).length;
  const expiredInvitations = store.invitations.filter((i) => i.status === 'EXPIRED').length;

  const licenseLimitTotal = store.subscriptions.reduce((sum, s) => sum + s.licenseLimit, 0);
  const licenseUsedTotal = store.userProductAccess.filter((a) =>
    ['PENDING', 'ACTIVE'].includes(a.status),
  ).length;

  const graceCount = store.subscriptions.filter(
    (s) => getSubscriptionEffectiveStatus(s) === 'GRACE_PERIOD',
  ).length;
  const blockedCount = store.subscriptions.filter(
    (s) => getSubscriptionEffectiveStatus(s) === 'BLOCKED',
  ).length;

  const byProduct = store.products.map((product) => ({
    product,
    subscriptions: store.subscriptions.filter((s) => s.productId === product.id).length,
  }));

  return {
    activeClients,
    suspendedClients,
    activeIdentities,
    pendingInvitations,
    expiredInvitations,
    licenseLimitTotal,
    licenseUsedTotal,
    graceCount,
    blockedCount,
    byProduct,
  };
}

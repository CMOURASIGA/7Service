import Link from 'next/link';
import { getCurrentTimeMs } from '@/lib/time/current';
import { requirePermission } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/status-badge';
import { SUBSCRIPTION_EFFECTIVE_STATUS_LABEL } from '@/lib/status-labels';

export const dynamic = 'force-dynamic';
export default async function LicensingPage() {
  await requirePermission('clients.view');
  const db = await createClient();
  const [subscriptions, accesses, overrides] = await Promise.all([
    db
      .from('subscriptions')
      .select(
        'id,client_id,product_id,status,license_limit,end_date,grace_days,clients(legal_name,trade_name),products(name)',
      )
      .order('created_at', { ascending: false }),
    db.from('user_product_access').select('subscription_id,status'),
    db.from('license_overrides').select('subscription_id,extra_licenses'),
  ]);
  if ([subscriptions, accesses, overrides].some((x) => x.error))
    throw new Error('Falha ao consultar licenciamento');
  const now = getCurrentTimeMs();
  const entries = (subscriptions.data ?? []).map((s) => {
    const used = (accesses.data ?? []).filter(
      (a) => a.subscription_id === s.id && ['ACTIVE', 'PENDING'].includes(a.status),
    ).length;
    const extra = (overrides.data ?? [])
      .filter((o) => o.subscription_id === s.id)
      .reduce((n, o) => n + o.extra_licenses, 0);
    const end = s.end_date ? Date.parse(s.end_date + 'T23:59:59Z') : null;
    const effective =
      s.status !== 'ACTIVE'
        ? s.status
        : end !== null && now > end
          ? now <= end + s.grace_days * 86400000
            ? 'GRACE_PERIOD'
            : 'BLOCKED'
          : 'ACTIVE';
    const label =
      SUBSCRIPTION_EFFECTIVE_STATUS_LABEL[
        effective as keyof typeof SUBSCRIPTION_EFFECTIVE_STATUS_LABEL
      ];
    return { s, used, extra, effective, label };
  });
  return (
    <main className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Licenciamento</h1>
        <p className="text-muted text-sm">
          Assinaturas e licencas persistidas por cliente e produto.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="p-3">Cliente</th>
              <th className="p-3">Produto</th>
              <th className="p-3">Status</th>
              <th className="p-3">Limite</th>
              <th className="p-3">Utilizadas</th>
              <th className="p-3">Disponiveis</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(({ s, used, extra, label }) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="p-3">
                  <Link className="text-brand-700 underline" href={`/clientes/${s.client_id}`}>
                    {s.clients?.trade_name || s.clients?.legal_name || s.client_id}
                  </Link>
                </td>
                <td className="p-3">{s.products?.name || s.product_id}</td>
                <td className="p-3">
                  <StatusBadge label={label.label} tone={label.tone} />
                </td>
                <td className="p-3">
                  {s.license_limit}
                  {extra > 0 ? ` (+${extra})` : ''}
                </td>
                <td className="p-3">{used}</td>
                <td className="p-3">{s.license_limit + extra - used}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!entries.length ? (
        <p className="text-muted text-sm">Nenhuma assinatura cadastrada.</p>
      ) : null}
    </main>
  );
}

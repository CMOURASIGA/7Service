import Link from 'next/link';

import { KpiCard } from '@/components/ui/kpi-card';
import { getDashboardKpis } from '@/services/dashboard';

export const metadata = {
  title: 'Dashboard - 7Service',
};

export default function DashboardPage() {
  const kpis = getDashboardKpis();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-xl font-semibold">Dashboard</h1>
        <p className="text-muted text-sm">Situação operacional do ecossistema Consult Services</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Clientes ativos" value={kpis.activeClients} />
        <KpiCard label="Clientes suspensos" value={kpis.suspendedClients} />
        <KpiCard label="Usuários ativos" value={kpis.activeIdentities} />
        <KpiCard label="Convites pendentes" value={kpis.pendingInvitations} />
        <KpiCard label="Convites expirados" value={kpis.expiredInvitations} />
        <KpiCard
          label="Licenças"
          value={`${kpis.licenseUsedTotal}/${kpis.licenseLimitTotal}`}
          hint="utilizadas / contratadas"
        />
        <KpiCard label="Assinaturas em carência" value={kpis.graceCount} />
        <KpiCard label="Assinaturas bloqueadas" value={kpis.blockedCount} />
      </div>

      <div className="border-border bg-background rounded-lg border p-4">
        <h2 className="text-foreground mb-3 text-sm font-semibold">Distribuição por produto</h2>
        <ul className="flex flex-col gap-2">
          {kpis.byProduct.map(({ product, subscriptions }) => (
            <li key={product.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{product.name}</span>
              <span className="text-muted">{subscriptions} assinatura(s)</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/clientes/novo"
          className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2 text-sm font-medium text-white"
        >
          Cadastrar cliente
        </Link>
        <Link
          href="/clientes"
          className="border-border text-foreground rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Consultar clientes
        </Link>
        <Link
          href="/convites"
          className="border-border text-foreground rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Revisar convites pendentes
        </Link>
      </div>
    </div>
  );
}

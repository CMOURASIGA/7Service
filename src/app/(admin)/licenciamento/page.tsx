import Link from 'next/link';

import { StatusBadge } from '@/components/ui/status-badge';
import { getLicenseUsage, getSubscriptionEffectiveStatus } from '@/lib/domain-rules';
import { getMockStore } from '@/lib/mock/store';
import { SUBSCRIPTION_EFFECTIVE_STATUS_LABEL } from '@/lib/status-labels';

export const metadata = {
  title: 'Licenciamento - 7Service',
};

export default function LicensingPage() {
  const store = getMockStore();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-xl font-semibold">Licenciamento</h1>
        <p className="text-muted text-sm">
          Limite contratado, utilizado e disponível por assinatura — validado sempre no backend
          antes da concessão de acesso.
        </p>
      </div>

      <div className="border-border bg-background overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-border text-muted border-b bg-slate-50 text-xs">
            <tr>
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium">Produto</th>
              <th className="px-4 py-2 font-medium">Status efetivo</th>
              <th className="px-4 py-2 font-medium">Contratado</th>
              <th className="px-4 py-2 font-medium">Utilizado</th>
              <th className="px-4 py-2 font-medium">Disponível</th>
            </tr>
          </thead>
          <tbody>
            {store.subscriptions.map((sub) => {
              const client = store.clients.find((c) => c.id === sub.clientId);
              const product = store.products.find((p) => p.id === sub.productId);
              const usage = getLicenseUsage(sub, store.userProductAccess, store.licenseOverrides);
              const effective = getSubscriptionEffectiveStatus(sub);
              const effectiveInfo = SUBSCRIPTION_EFFECTIVE_STATUS_LABEL[effective];

              return (
                <tr key={sub.id} className="border-border border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/clientes/${sub.clientId}`}
                      className="text-brand-700 font-medium hover:underline"
                    >
                      {client?.tradeName ?? client?.legalName ?? sub.clientId}
                    </Link>
                  </td>
                  <td className="text-foreground px-4 py-2">{product?.name ?? sub.productId}</td>
                  <td className="px-4 py-2">
                    <StatusBadge label={effectiveInfo.label} tone={effectiveInfo.tone} />
                  </td>
                  <td className="text-muted px-4 py-2">
                    {usage.licenseLimit}
                    {usage.extraLicenses > 0 ? ` (+${usage.extraLicenses} override)` : ''}
                  </td>
                  <td className="text-muted px-4 py-2">{usage.used}</td>
                  <td className="px-4 py-2">
                    <span
                      className={usage.available <= 0 ? 'text-danger font-medium' : 'text-muted'}
                    >
                      {usage.available}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

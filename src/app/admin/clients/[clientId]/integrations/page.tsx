'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Product = '7COMMANDER' | '7CLINIC';
type Entitlement = {
  clientId: string; product: Product; subscriptionId: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED'; licenseLimit: number;
  validUntil: string | null;
};
const products: Product[] = ['7COMMANDER', '7CLINIC'];

export default function ClientIntegrationsPage({
  params,
}: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const [data, setData] = useState<Partial<Record<Product, Entitlement>>>({});
  const [errors, setErrors] = useState<Partial<Record<Product, string>>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(products.map(async (product) => {
        try {
          const url = `/api/internal/clients/${encodeURIComponent(clientId)}/products/${product}/entitlement`;
          const response = await fetch(url, { cache: 'no-store' });
          const result = await response.json() as { entitlement?: Entitlement; error?: string };
          if (!response.ok || !result.entitlement) throw new Error(result.error ?? 'Falha na consulta');
          return { product, entitlement: result.entitlement, error: '' };
        } catch (e) {
          return { product, entitlement: undefined, error: e instanceof Error ? e.message : 'Falha na consulta' };
        }
      }));
      const next: Partial<Record<Product, Entitlement>> = {};
      const nextErrors: Partial<Record<Product, string>> = {};
      for (const item of results) {
        if (item.entitlement) next[item.product] = item.entitlement;
        if (item.error) nextErrors[item.product] = item.error;
      }
      setData(next); setErrors(nextErrors);
    } finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { void Promise.resolve().then(() => refresh()); }, [refresh]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Integrações comerciais do cliente</h1>
      <Link className="text-blue-700 underline" href={`/admin/clients/${encodeURIComponent(clientId)}/integrations/links`}>Gerenciar vínculos de sistemas</Link>
      <p className="text-sm text-gray-600">Situação de assinatura e limite de licenças no 7Service. A ativação técnica em cada sistema é independente.</p>
      <button type="button" onClick={() => void refresh()} disabled={loading}
        className="rounded border px-4 py-2 text-sm disabled:opacity-50">
        {loading ? 'Consultando...' : 'Atualizar licenciamento'}
      </button>
      <div className="grid gap-4 md:grid-cols-2">
        {products.map((product) => {
          const item = data[product];
          return <section key={product} className="space-y-2 rounded-lg border p-5">
            <h2 className="text-lg font-semibold">{product === '7COMMANDER' ? '7Commander' : '7Clinic'}</h2>
            {errors[product] && <p role="alert" className="text-sm text-red-700">{errors[product]}</p>}
            {item && <>
              <p>Status: <strong>{item.status}</strong></p>
              <p>Licenças contratadas: <strong>{item.licenseLimit}</strong></p>
              <p>Vigência final: {item.validUntil ?? 'Não definida'}</p>
              <p className="break-all text-sm">Assinatura: {item.subscriptionId ?? 'Não cadastrada'}</p>
            </>}
          </section>;
        })}
      </div>
    </main>
  );
}

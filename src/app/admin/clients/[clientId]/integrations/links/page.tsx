'use client';
import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
type Product = '7COMMANDER' | '7CLINIC';
type LinkRow = {
  id: string;
  product_code: Product;
  external_tenant_id: string;
  status: 'ACTIVE' | 'DISABLED';
};
const products: Product[] = ['7COMMANDER', '7CLINIC'];

export default function TenantLinksPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const endpoint = `/api/internal/clients/${encodeURIComponent(clientId)}/integrations`;
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [product, setProduct] = useState<Product>('7COMMANDER');
  const [tenant, setTenant] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'DISABLED'>('ACTIVE');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch(endpoint, { cache: 'no-store' });
    const result = (await response.json()) as { links?: LinkRow[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? 'Falha ao consultar vínculos');
    setRows(result.links ?? []);
  }, [endpoint]);
  useEffect(() => {
    Promise.resolve()
      .then(() => refresh())
      .catch((e: unknown) => setMessage(e instanceof Error ? e.message : 'Erro'));
  }, [refresh]);

  function choose(value: Product) {
    setProduct(value);
    const current = rows.find((row) => row.product_code === value);
    setTenant(current?.external_tenant_id ?? '');
    setStatus(current?.status ?? 'ACTIVE');
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, externalTenantId: tenant, status }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Falha ao salvar');
      await refresh();
      setMessage('Vínculo atualizado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-6">
      <Link
        className="text-blue-700 underline"
        href={`/admin/clients/${encodeURIComponent(clientId)}/integrations`}
      >
        Voltar para integrações
      </Link>
      <h1 className="text-2xl font-semibold">Vínculos de clientes com sistemas</h1>
      <p className="text-sm text-gray-600">
        O identificador externo deve ser obtido do sistema de destino. Este vínculo não concede
        acesso automaticamente.
      </p>
      <form onSubmit={save} className="space-y-4 rounded-lg border p-4">
        <label className="block text-sm">
          Sistema
          <select
            className="mt-1 block w-full rounded border p-2"
            value={product}
            onChange={(e) => choose(e.target.value as Product)}
          >
            {products.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          ID da organização / clínica no destino
          <input
            className="mt-1 block w-full rounded border p-2"
            required
            maxLength={200}
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Estado do vínculo
          <select
            className="mt-1 block w-full rounded border p-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'DISABLED')}
          >
            <option value="ACTIVE">Ativo</option>
            <option value="DISABLED">Desabilitado</option>
          </select>
        </label>
        <button
          disabled={saving}
          className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar vínculo'}
        </button>
      </form>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <ul className="divide-y rounded-lg border">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap justify-between gap-3 p-3 text-sm">
            <span>
              {row.product_code}: {row.external_tenant_id}
            </span>
            <strong>{row.status}</strong>
          </li>
        ))}
      </ul>
    </main>
  );
}

'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

type Item = {
  id: string;
  environment: 'development' | 'homologation' | 'production';
  entry_url: string | null;
  version_sha: string | null;
  database_resource_ref: string | null;
};
export default function EditEnvironmentPage({
  params,
}: {
  params: Promise<{ deploymentId: string; environmentId: string }>;
}) {
  const { deploymentId, environmentId } = use(params);
  const collection = `/api/internal/deployments/${encodeURIComponent(deploymentId)}/environments`;
  const [environment, setEnvironment] = useState<Item | null>(null);
  const [url, setUrl] = useState('');
  const [sha, setSha] = useState('');
  const [resource, setResource] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(collection, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Consulta de ambientes não autorizada');
        return response.json() as Promise<{ environments: Item[] }>;
      })
      .then(({ environments }) => {
        const item = environments.find((entry) => entry.id === environmentId);
        if (!item) throw new Error('Ambiente não encontrado');
        setEnvironment(item);
        setUrl(item.entry_url ?? '');
        setSha(item.version_sha ?? '');
        setResource(item.database_resource_ref ?? '');
      })
      .catch((error: unknown) =>
        setMessage(error instanceof Error ? error.message : 'Erro ao consultar'),
      );
  }, [collection, environmentId]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!environment) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`${collection}/${encodeURIComponent(environmentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: {
            environment: environment.environment,
            entryUrl: url || null,
            versionSha: sha || null,
            databaseResourceRef: resource || null,
          },
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Erro ao salvar');
      setMessage('Ambiente atualizado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-2xl space-y-5 p-6">
      <Link
        className="text-blue-700 underline"
        href={`/admin/deployments/${encodeURIComponent(deploymentId)}/environments`}
      >
        Voltar para Ambientes
      </Link>
      <h1 className="text-2xl font-semibold">Editar ambiente {environment?.environment ?? ''}</h1>
      {environment && (
        <form onSubmit={save} className="space-y-4">
          <label className="block text-sm">
            URL HTTPS
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1 block w-full rounded border p-2"
            />
          </label>
          <label className="block text-sm">
            SHA da versão
            <input
              value={sha}
              onChange={(e) => setSha(e.target.value)}
              className="mt-1 block w-full rounded border p-2"
            />
          </label>
          <label className="block text-sm">
            Referência do banco
            <input
              value={resource}
              onChange={(e) => setResource(e.target.value)}
              className="mt-1 block w-full rounded border p-2"
            />
          </label>
          <button
            disabled={busy}
            className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </main>
  );
}

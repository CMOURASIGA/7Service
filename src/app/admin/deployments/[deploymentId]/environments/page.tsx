'use client';

import { use, useCallback, useEffect, useState } from 'react';

type Environment = { id: string; environment: string; entry_url: string | null; status: string; version_sha: string | null; database_resource_ref: string | null };
type Kind = 'development' | 'homologation' | 'production';
const choices: Kind[] = ['development', 'homologation', 'production'];

export default function EnvironmentsPage({ params }: { params: Promise<{ deploymentId: string }> }) {
  const { deploymentId } = use(params);
  const endpoint = `/api/internal/deployments/${encodeURIComponent(deploymentId)}/environments`;
  const [rows, setRows] = useState<Environment[]>([]);
  const [kind, setKind] = useState<Kind>('development');
  const [url, setUrl] = useState('');
  const [sha, setSha] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) throw new Error('Falha ao consultar ambientes');
    const data = await response.json() as { environments: Environment[] };
    setRows(data.environments);
  }, [endpoint]);
  useEffect(() => { refresh().catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erro')); }, [refresh]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: kind, entryUrl: url || null, versionSha: sha || null }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Falha ao cadastrar ambiente');
      setUrl(''); setSha(''); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setBusy(false); }
  }

  async function changeStatus(row: Environment, status: string) {
    setError('');
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(row.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', status }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Falha na alteração');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro'); }
  }

  return <main className="mx-auto max-w-5xl space-y-5 p-6">
    <h1 className="text-2xl font-semibold">Ambientes da implantação</h1>
    <p className="text-sm text-gray-600">Cadastre e controle os ambientes de desenvolvimento, homologação e produção.</p>
    <form onSubmit={create} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
      <label className="text-sm">Tipo de ambiente
        <select className="mt-1 block w-full rounded border p-2" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          {choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
        </select>
      </label>
      <label className="text-sm">URL HTTPS
        <input className="mt-1 block w-full rounded border p-2" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
      </label>
      <label className="text-sm">SHA da versão
        <input className="mt-1 block w-full rounded border p-2" value={sha} onChange={(e) => setSha(e.target.value)} />
      </label>
      <button className="self-end rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={busy}>Cadastrar ambiente</button>
    </form>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <ul className="divide-y rounded-lg border">
      {rows.map((row) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="space-y-1 text-sm">
          <div className="font-medium">{row.environment} - {row.status}</div>
          <div className="break-all">{row.entry_url ?? 'URL não definida'}</div>
          <div className="text-gray-500">{row.version_sha ?? 'Sem SHA'}</div>
        </div>
        <div className="flex gap-2">
          {row.status === 'ACTIVE' && <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => changeStatus(row, 'SUSPENDED')}>Suspender</button>}
          {row.status === 'SUSPENDED' && <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => changeStatus(row, 'ACTIVE')}>Reativar</button>}
          {row.status !== 'RETIRED' && <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => changeStatus(row, 'RETIRED')}>Encerrar</button>}
        </div>
      </li>)}
    </ul>
  </main>;
}

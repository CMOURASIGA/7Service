'use client';

import { use, useCallback, useEffect, useState } from 'react';

type DocumentRow = {
  id: string; original_name: string; size_bytes: number;
  signed_document: boolean; uploaded_at: string;
};

export default function ContractDocumentsPage({
  params,
}: { params: Promise<{ contractId: string }> }) {
  const { contractId } = use(params);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const endpoint = `/api/internal/contracts/${encodeURIComponent(contractId)}/documents`;

  const refresh = useCallback(async () => {
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) throw new Error('Não foi possível consultar os documentos');
    const data = await response.json() as { documents: DocumentRow[] };
    setDocuments(data.documents);
  }, [endpoint]);

  useEffect(() => {
    refresh().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Falha na consulta'));
  }, [refresh]);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setWorking(true);
    setError('');
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('signedDocument', String(signed));
      const response = await fetch(endpoint, { method: 'POST', body: form });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Falha no envio');
      setFile(null);
      setSigned(false);
      const input = document.getElementById('contract-pdf-file') as HTMLInputElement | null;
      if (input) input.value = '';
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar PDF');
    } finally { setWorking(false); }
  }

  async function openDocument(id: string) {
    setError('');
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Acesso ao documento não autorizado');
      const data = await response.json() as { url: string };
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao acessar documento'); }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Documentos contratuais</h1>
      <p className="text-sm text-gray-600">Arquivos PDF privados, limite de 10 MB. O acesso exige perfil administrativo.</p>
      <form onSubmit={upload} className="space-y-4 rounded-lg border p-4">
        <label className="block text-sm font-medium" htmlFor="contract-pdf-file">Documento PDF</label>
        <input id="contract-pdf-file" type="file" accept="application/pdf,.pdf" required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} />
          Contrato assinado
        </label>
        <button type="submit" disabled={working || !file}
          className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
          {working ? 'Enviando...' : 'Adicionar PDF'}
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Arquivos registrados</h2>
        {documents.length === 0 && <p className="text-sm text-gray-600">Nenhum documento cadastrado.</p>}
        <ul className="divide-y rounded-lg border">
          {documents.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 p-3">
              <span className="min-w-0 break-all text-sm">{item.original_name} ({Math.ceil(item.size_bytes / 1024)} KB)
                {item.signed_document ? ' - Assinado' : ''}</span>
              <button type="button" onClick={() => openDocument(item.id)}
                className="shrink-0 rounded border px-3 py-2 text-sm">Abrir</button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

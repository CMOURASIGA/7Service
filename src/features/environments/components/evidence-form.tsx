'use client';

import { useActionState } from 'react';
import { recordEvidence, type EvidenceState } from '@/app/(admin)/ambientes/evidence-actions';

export function EvidenceForm({ environments }: { environments: { id: string; label: string }[] }) {
  const [state, submit, pending] = useActionState(recordEvidence, { error: null } as EvidenceState);
  return (
    <form action={submit} className="flex flex-col gap-3 rounded-lg border p-5">
      <h2 className="font-semibold">Registrar referência de deploy</h2>
      <p className="text-muted text-xs">
        Toda referência começa NÃO VERIFICADA. Não ativa infraestrutura nem autoriza publicação.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Ambiente
        <select name="environmentId" required defaultValue="" className="rounded border p-2">
          <option value="" disabled>
            Selecione
          </option>
          {environments.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        SHA completo
        <input
          name="commitSha"
          required
          minLength={40}
          maxLength={40}
          pattern="[a-fA-F0-9]{40}"
          className="rounded border p-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Origem
        <select name="provider" defaultValue="GITHUB_ACTIONS" className="rounded border p-2">
          <option value="GITHUB_ACTIONS">GitHub Actions</option>
          <option value="VERCEL">Vercel</option>
          <option value="MANUAL_REVIEW">Conferência manual</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Identificador da execução
        <input
          name="runReference"
          required
          minLength={8}
          maxLength={512}
          className="rounded border p-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Observações
        <textarea name="notes" rows={2} maxLength={1000} className="rounded border p-2" />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm">
          {state.success}
        </p>
      ) : null}
      <button
        disabled={pending || !environments.length}
        className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? 'Registrando...' : 'Registrar referência não verificada'}
      </button>
    </form>
  );
}

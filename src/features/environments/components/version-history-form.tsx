'use client';

import { useActionState } from 'react';
import {
  recordDeploymentVersion,
  type VersionFormState,
} from '@/app/(admin)/ambientes/version-actions';

export function VersionHistoryForm({
  environments,
}: {
  environments: { id: string; label: string }[];
}) {
  const initial: VersionFormState = { error: null };
  const [state, submit, pending] = useActionState(recordDeploymentVersion, initial);
  return (
    <form action={submit} className="flex flex-col gap-3 rounded-lg border p-5">
      <h2 className="font-semibold">Registrar relato de versão</h2>
      <p className="text-muted text-xs">
        O registro de uma versão não confirma deploy nem provisionamento. Estados operacionais são
        controlados separadamente.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Ambiente
        <select name="environmentId" required defaultValue="" className="rounded border p-2">
          <option value="" disabled>
            Selecione um ambiente
          </option>
          {environments.map((environment) => (
            <option key={environment.id} value={environment.id}>
              {environment.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        SHA completo do commit
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
        Resultado informado
        <select name="status" defaultValue="PENDING" className="rounded border p-2">
          <option value="PENDING">Pendente</option>
          <option value="SUCCESS">Reportado como sucesso</option>
          <option value="FAILED">Reportado como falha</option>
          <option value="ROLLED_BACK">Reportado como revertido</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Evidência ou observações
        <textarea name="notes" maxLength={1000} rows={3} className="rounded border p-2" />
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
        type="submit"
        disabled={pending || !environments.length}
        className="rounded bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? 'Salvando...' : 'Registrar versão'}
      </button>
    </form>
  );
}

'use client';

import { useActionState, useState } from 'react';
import { manageEnvironment } from './actions';

type Environment = {
  id: string;
  status: string;
  entry_url: string | null;
  version_sha: string | null;
  database_resource_ref: string | null;
};

export function EnvironmentLifecycleControls({ environment }: { environment: Environment }) {
  const [state, action, pending] = useActionState(manageEnvironment, { error: null });
  const [editing, setEditing] = useState(false);
  const active = environment.status !== 'RETIRED';
  const canSuspend = environment.status === 'PLANNED' || environment.status === 'ACTIVE';
  const canReactivate = environment.status === 'SUSPENDED';

  return (
    <div className="mt-3 space-y-3">
      {active && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-sm"
            onClick={() => setEditing(!editing)}
            disabled={pending}
          >
            {editing ? 'Fechar edição' : 'Editar'}
          </button>
          {canSuspend && (
            <form action={action}>
              <input type="hidden" name="environmentId" value={environment.id} />
              <input type="hidden" name="action" value="SUSPEND" />
              <button disabled={pending} className="rounded border px-3 py-1.5 text-sm">
                Suspender
              </button>
            </form>
          )}
          {canReactivate && (
            <form action={action}>
              <input type="hidden" name="environmentId" value={environment.id} />
              <input type="hidden" name="action" value="REACTIVATE" />
              <button disabled={pending} className="rounded border px-3 py-1.5 text-sm">
                Reativar
              </button>
            </form>
          )}
          <form
            action={action}
            onSubmit={(event) => {
              if (!window.confirm('Encerrar este ambiente? A operação é irreversível.'))
                event.preventDefault();
            }}
          >
            <input type="hidden" name="environmentId" value={environment.id} />
            <input type="hidden" name="action" value="RETIRE" />
            <button
              disabled={pending}
              className="rounded border border-red-500 px-3 py-1.5 text-sm text-red-700"
            >
              Encerrar
            </button>
          </form>
        </div>
      )}
      {editing && active && (
        <form action={action} className="grid gap-3 rounded border p-3 sm:grid-cols-2">
          <input type="hidden" name="environmentId" value={environment.id} />
          <input type="hidden" name="action" value="EDIT" />
          <label className="flex flex-col gap-1 text-sm">
            URL HTTPS
            <input
              className="rounded border p-2"
              type="url"
              name="entryUrl"
              defaultValue={environment.entry_url ?? ''}
              placeholder="https://"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            SHA da versão
            <input
              className="rounded border p-2"
              name="versionSha"
              defaultValue={environment.version_sha ?? ''}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            Referência do banco
            <input
              className="rounded border p-2"
              name="databaseResourceRef"
              defaultValue={environment.database_resource_ref ?? ''}
            />
          </label>
          <button
            disabled={pending}
            className="rounded bg-blue-700 px-3 py-2 text-sm text-white sm:col-span-2"
          >
            {pending ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-green-700">
          {state.success}
        </p>
      )}
      {!active && (
        <p className="text-sm text-gray-600">Ambiente encerrado. Edição e reativação bloqueadas.</p>
      )}
    </div>
  );
}

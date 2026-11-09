'use client';

import { ActionButton } from '@/components/ui/action-button';
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
          <ActionButton
            type="button"
            variant="secondary"
            onClick={() => setEditing(!editing)}
            disabled={pending}
          >
            {editing ? 'Fechar edição' : 'Editar'}
          </ActionButton>
          {canSuspend && (
            <form action={action}>
              <input type="hidden" name="environmentId" value={environment.id} />
              <input type="hidden" name="action" value="SUSPEND" />
              <ActionButton disabled={pending} variant="secondary">
                Suspender
              </ActionButton>
            </form>
          )}
          {canReactivate && (
            <form action={action}>
              <input type="hidden" name="environmentId" value={environment.id} />
              <input type="hidden" name="action" value="REACTIVATE" />
              <ActionButton disabled={pending} variant="secondary">
                Reativar
              </ActionButton>
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
            <ActionButton
              disabled={pending}
              variant="danger"
            >
              Encerrar
            </ActionButton>
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
          <ActionButton
            disabled={pending}
            className="sm:col-span-2"
          >
            {pending ? 'Salvando...' : 'Salvar alterações'}
          </ActionButton>
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

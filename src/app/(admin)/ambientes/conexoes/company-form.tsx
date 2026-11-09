'use client';
import { useActionState } from 'react';
import { ActionButton } from '@/components/ui/action-button';
import { bindExistingCompanyToEnvironment } from './actions';

export function EnvironmentCompanyForm({
  environments, clients,
}: {
  environments: { id: string; label: string }[];
  clients: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(bindExistingCompanyToEnvironment, { error:null });
  const input = 'rounded-md border px-3 py-2 text-sm';
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-3 rounded-lg border p-5">
      <h2 className="font-semibold">Vincular empresa à instalação</h2>
      <p className="text-muted text-sm">
        Uma instalação pode conter várias empresas de um grupo.
        O vínculo é permitido somente quando a empresa já pertence à implantação.
        Este campo identifica uma organização já existente no produto de destino.
      </p>
      <label className="flex flex-col gap-1 text-sm">Ambiente
        <select name="environmentId" required className={input} defaultValue="">
          <option value="" disabled>Selecione o ambiente</option>
          {environments.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">Empresa do 7Service
        <select name="clientId" required className={input} defaultValue="">
          <option value="" disabled>Selecione a empresa</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">Identificador existente no sistema de destino
        <input name="remoteCompanyId" required maxLength={128} className={input}/>
      </label>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.success && <p role="status" className="text-sm">{state.success}</p>}
      <ActionButton disabled={pending || !environments.length || !clients.length}>
        {pending ? 'Vinculando...' : 'Vincular empresa'}
      </ActionButton>
    </form>
  );
}

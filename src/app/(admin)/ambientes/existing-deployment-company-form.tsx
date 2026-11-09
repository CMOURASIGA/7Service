'use client';
import { useActionState } from 'react';
import { ActionButton } from '@/components/ui/action-button';
import { attachCompanyToExistingDeployment } from './actions';

export function ExistingDeploymentCompanyForm({
  deployments, clients,
}: {
  deployments: { id:string; name:string; model:string }[];
  clients: { id:string; legal_name:string }[];
}) {
  const [state, submit, pending] = useActionState(
    attachCompanyToExistingDeployment,{error:null},
  );
  return (
    <form action={submit} className="flex max-w-3xl flex-col gap-3 rounded-lg border p-5">
      <h2 className="font-semibold">Adicionar empresa a uma implantação existente</h2>
      <p className="text-muted text-sm">
        Permite que empresas contratadas do mesmo grupo compartilhem a instalação,
        mesmo quando o Supabase é dedicado. Não cria ou altera bancos de dados.
        Empresas de grupos diferentes não podem compartilhar instalação dedicada.
      </p>
      <label className="flex flex-col gap-1 text-sm">Implantação existente
        <select name="deploymentId" className="rounded-md border p-2" required defaultValue="">
          <option value="" disabled>Selecione a implantação</option>
          {deployments.map(d=><option key={d.id} value={d.id}>
            {d.name} ({d.model})
          </option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">Empresa contratada
        <select name="clientId" className="rounded-md border p-2" required defaultValue="">
          <option value="" disabled>Selecione a empresa</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.legal_name}</option>)}
        </select>
      </label>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.success && <p role="status" className="text-sm">{state.success}</p>}
      <ActionButton disabled={pending || !deployments.length || !clients.length}>
        {pending?'Validando grupo...':'Vincular à instalação existente'}
      </ActionButton>
    </form>
  );
}

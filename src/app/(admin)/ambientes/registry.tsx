'use client';

import { useActionState } from 'react';
import {
  createDedicatedDeployment,
  registerEnvironment,
} from './actions';

interface Lookup { id: string; name?: string; legal_name?: string; }
interface Deployment { id: string; name: string; model: string; }

export function EnvironmentRegistry({
  clients,products,deployments,
}: {
  clients:Lookup[];products:Lookup[];deployments:Deployment[];
}) {
  const [deploymentState,createAction,deploymentPending]=useActionState(createDedicatedDeployment,{error:null});
  const [environmentState,environmentAction,environmentPending]=useActionState(registerEnvironment,{error:null});
  const input='rounded-md border px-3 py-2 text-sm';
  return <section className="grid gap-5 lg:grid-cols-2">
    <form action={createAction} className="flex flex-col gap-3 rounded-lg border p-5">
      <h2 className="font-semibold">Vincular implantação dedicada</h2>
      <p className="text-muted text-xs">Somente cadastro administrativo. Não cria infraestrutura nem executa deploy.</p>
      <label className="flex flex-col gap-1 text-sm">Cliente
        <select className={input} name="clientId" required defaultValue="">
          <option value="" disabled>Selecione um cliente</option>
          {clients.map(c=><option value={c.id} key={c.id}>{c.legal_name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">Produto
        <select className={input} name="productId" required defaultValue="">
          <option value="" disabled>Selecione um produto</option>
          {products.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">Identificação da implantação
        <input className={input} name="name" minLength={3} maxLength={120} required/>
      </label>
      {deploymentState.error?<p role="alert" className="text-red-700 text-sm">{deploymentState.error}</p>:null}
      {deploymentState.success?<p role="status" className="text-sm">{deploymentState.success}</p>:null}
      <button className="rounded-md bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={deploymentPending||!clients.length||!products.length}>Cadastrar implantação</button>
    </form>
    <form action={environmentAction} className="flex flex-col gap-3 rounded-lg border p-5">
      <h2 className="font-semibold">Registrar ambiente</h2>
      <p className="text-muted text-xs">URL e estado planejado não confirmam a disponibilização real.</p>
      <label className="flex flex-col gap-1 text-sm">Implantação
        <select className={input} name="deploymentId" required defaultValue="">
          <option value="" disabled>Selecione uma implantação</option>
          {deployments.map(d=><option value={d.id} key={d.id}>{d.name} ({d.model})</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">Ambiente
        <select className={input} name="environment" required defaultValue="DEVELOPMENT">
          <option value="DEVELOPMENT">Desenvolvimento</option>
          <option value="HOMOLOGATION">Homologação</option>
          <option value="DEMO">Demonstração</option>
          <option value="PRODUCTION">Produção</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">URL HTTPS (opcional)
        <input className={input} name="entryUrl" type="url" pattern="https://.*" placeholder="https://"/>
      </label>
      {environmentState.error?<p role="alert" className="text-red-700 text-sm">{environmentState.error}</p>:null}
      {environmentState.success?<p role="status" className="text-sm">{environmentState.success}</p>:null}
      <button className="rounded-md bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={environmentPending||!deployments.length}>Registrar ambiente</button>
    </form>
  </section>;
}

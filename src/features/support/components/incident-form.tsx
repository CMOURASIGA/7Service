'use client';

import { useActionState } from 'react';
import { createIncidentAction } from '@/app/(admin)/suporte/actions';

interface Option{id:string;label:string;}
export function IncidentForm({
  clients,products,environments,
}:{
  clients:Option[];products:Option[];environments:Option[];
}){
  const [state,submit,pending]=useActionState(createIncidentAction,{error:null});
  const input='rounded border px-3 py-2 text-sm';
  return <form action={submit} className="grid gap-3 rounded-lg border p-5 sm:grid-cols-2">
    <div className="sm:col-span-2"><h2 className="font-semibold">Novo incidente</h2>
      <p className="text-muted text-xs">Descreva falhas operacionais; não registre senhas, dados de pacientes ou outras informações sensíveis.</p>
    </div>
    <label className="flex flex-col gap-1 text-sm">Cliente
      <select name="clientId" required defaultValue="" className={input}>
        <option value="" disabled>Selecione o cliente</option>
        {clients.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
    </label>
    <label className="flex flex-col gap-1 text-sm">Produto
      <select name="productId" defaultValue="" className={input}>
        <option value="">Não definido</option>
        {products.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
    </label>
    <label className="flex flex-col gap-1 text-sm">Ambiente
      <select name="environmentId" defaultValue="" className={input}>
        <option value="">Não definido</option>
        {environments.map(e=><option key={e.id} value={e.id}>{e.label}</option>)}
      </select>
    </label>
    <label className="flex flex-col gap-1 text-sm">Severidade
      <select name="severity" defaultValue="MEDIUM" className={input}>
        <option value="LOW">Baixa</option><option value="MEDIUM">Média</option>
        <option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option>
      </select>
    </label>
    <label className="flex flex-col gap-1 text-sm sm:col-span-2">Título
      <input name="title" required minLength={5} maxLength={180} className={input}/>
    </label>
    <label className="flex flex-col gap-1 text-sm sm:col-span-2">Descrição
      <textarea name="description" rows={3} maxLength={3000} className={input}/>
    </label>
    {state.error?<p role="alert" className="text-sm text-red-700 sm:col-span-2">{state.error}</p>:null}
    {state.success?<p role="status" className="text-sm sm:col-span-2">{state.success}</p>:null}
    <button disabled={pending||!clients.length} className="rounded bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50">
      {pending?'Salvando...':'Registrar incidente'}
    </button>
  </form>;
}

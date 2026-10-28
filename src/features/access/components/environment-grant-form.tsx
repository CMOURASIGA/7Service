'use client';

import { useActionState, useMemo, useState } from 'react';
import { grantEnvironmentAction } from '@/app/(admin)/usuarios/[id]/ambientes/actions';

interface AccessOption {id:string;label:string;clientId:string;productId:string;}
interface EnvironmentOption {id:string;label:string;clientId:string;productId:string;}
export function EnvironmentGrantForm({
  identityId,accesses,environments,
}:{
  identityId:string;accesses:AccessOption[];environments:EnvironmentOption[];
}){
  const [state,submit,pending]=useActionState(grantEnvironmentAction.bind(null,identityId),{error:null});
  const [accessId,setAccessId]=useState(accesses[0]?.id??'');
  const selected=accesses.find(x=>x.id===accessId);
  const matching=useMemo(()=>environments.filter(e=>
    e.clientId===selected?.clientId&&e.productId===selected?.productId
  ),[environments,selected?.clientId,selected?.productId]);
  if(!accesses.length||!environments.length) return <p className="text-muted text-sm">
    Nenhum acesso a produto e ambiente operacional ativo disponível para vincular.
  </p>;
  return <form action={submit} className="flex flex-col gap-3">
    <label className="flex flex-col gap-1 text-sm">Acesso a produto
      <select name="accessId" value={accessId} onChange={e=>setAccessId(e.target.value)}
        className="rounded border p-2">{accesses.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}</select>
    </label>
    <label className="flex flex-col gap-1 text-sm">Ambiente
      <select name="environmentId" key={accessId} defaultValue={matching[0]?.id??''}
        className="rounded border p-2" required>
        {matching.length?matching.map(e=><option key={e.id} value={e.id}>{e.label}</option>):
          <option value="">Nenhum ambiente elegível</option>}
      </select>
    </label>
    {state.error?<p role="alert" className="text-red-700 text-sm">{state.error}</p>:null}
    {state.success?<p role="status" className="text-sm">{state.success}</p>:null}
    <button type="submit" disabled={pending||!matching.length}
      className="rounded bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50">
      {pending?'Salvando...':'Autorizar ambiente'}
    </button>
  </form>;
}

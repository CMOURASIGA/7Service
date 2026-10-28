'use client';
import { useActionState } from 'react';
import { grantLicenseOverrideAction } from '@/app/(admin)/licenciamento/actions';

export function OverrideForm({ subscriptionId }:{subscriptionId:string}){
  const [state,submit,pending]=useActionState(grantLicenseOverrideAction,{error:null});
  return <form action={submit} className="mt-2 flex flex-wrap items-end gap-2">
    <input type="hidden" name="subscriptionId" value={subscriptionId}/>
    <label className="flex flex-col gap-1 text-xs">Licenças extras
      <input name="extraLicenses" type="number" required min={1} max={10000}
        className="w-24 rounded border px-2 py-1 text-sm"/>
    </label>
    <label className="flex flex-col gap-1 text-xs">Justificativa
      <input name="reason" required minLength={10} maxLength={500}
        placeholder="Motivo da exceção" className="rounded border px-2 py-1 text-sm"/>
    </label>
    <button type="submit" disabled={pending} className="rounded border px-2 py-1 text-xs disabled:opacity-50">{pending?'Salvando...':'Conceder exceção'}</button>
    {state.error?<p role="alert" className="w-full text-xs text-red-700">{state.error}</p>:null}
    {state.success?<p role="status" className="w-full text-xs">{state.success}</p>:null}
  </form>;
}

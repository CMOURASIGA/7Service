'use client';
import { useActionState } from 'react';
import { addCompanyToGroup, createCustomerGroup } from './actions';
type Option = { id: string; label: string };

export function GroupForms({ groups, clients }: { groups: Option[]; clients: Option[] }) {
  const [creation, createAction, creating] = useActionState(createCustomerGroup, { error: null });
  const [linking, linkAction, linkingBusy] = useActionState(addCompanyToGroup, { error: null });
  const input = 'rounded-md border px-3 py-2 text-sm';
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form action={createAction} className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-semibold">Novo grupo empresarial</h2>
        <label className="flex flex-col gap-1 text-sm">Nome do grupo
          <input name="name" required minLength={3} maxLength={160} className={input} />
        </label>
        {creation.error && <p role="alert" className="text-sm text-red-700">{creation.error}</p>}
        {creation.success && <p role="status" className="text-sm">{creation.success}</p>}
        <button className="rounded-md bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
          disabled={creating}>{creating ? 'Salvando...' : 'Cadastrar grupo'}</button>
      </form>
      <form action={linkAction} className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-semibold">Vincular empresa ao grupo</h2>
        <label className="flex flex-col gap-1 text-sm">Grupo
          <select name="groupId" required className={input} defaultValue="">
            <option value="" disabled>Selecione o grupo</option>
            {groups.map(g => <option value={g.id} key={g.id}>{g.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">Empresa
          <select name="clientId" required className={input} defaultValue="">
            <option value="" disabled>Selecione a empresa</option>
            {clients.map(c => <option value={c.id} key={c.id}>{c.label}</option>)}
          </select>
        </label>
        {linking.error && <p role="alert" className="text-sm text-red-700">{linking.error}</p>}
        {linking.success && <p role="status" className="text-sm">{linking.success}</p>}
        <button className="rounded-md bg-blue-700 px-3 py-2 text-white disabled:opacity-50"
          disabled={linkingBusy || !groups.length || !clients.length}>
          {linkingBusy ? 'Vinculando...' : 'Vincular empresa'}
        </button>
      </form>
    </div>
  );
}

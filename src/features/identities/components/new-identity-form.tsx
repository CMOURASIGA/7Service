'use client';

import { useActionState } from 'react';
import { createIdentityMembershipAction } from '@/app/(admin)/usuarios/actions';

export function NewIdentityForm({
  clients,
}: {
  clients: { id: string; legal_name: string; trade_name: string | null }[];
}) {
  const [state, action, pending] = useActionState(createIdentityMembershipAction, { error: null });
  return (
    <form action={action} className="grid gap-3 rounded-lg border p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h2 className="font-semibold">Cadastrar ou vincular identidade global</h2>
        <p className="text-muted text-xs">
          Uma pessoa pode participar de múltiplas empresas. Convites são enviados pelo provedor de
          autenticação.
        </p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input required name="firstName" maxLength={90} className="rounded border p-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Sobrenome
        <input required name="lastName" maxLength={90} className="rounded border p-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        E-mail global
        <input required type="email" name="email" className="rounded border p-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Empresa
        <select required name="clientId" defaultValue="" className="rounded border p-2">
          <option value="" disabled>
            Selecione a empresa
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.trade_name || c.legal_name}
            </option>
          ))}
        </select>
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm sm:col-span-2">
          {state.success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !clients.length}
        className="rounded bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? 'Salvando...' : 'Cadastrar ou vincular'}
      </button>
    </form>
  );
}

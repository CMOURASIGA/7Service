'use client';

import { useActionState, useMemo, useState } from 'react';
import { createIdentityMembershipAction } from '@/app/(admin)/usuarios/actions';

type ClientOption = { id: string; legal_name: string; trade_name: string | null };
type ProductOption = {
  clientId: string;
  subscriptionId: string;
  productName: string;
  licenseLimit: number;
  licensesUsed: number;
  roles: { id: string; code: string; name: string }[];
};

export function NewIdentityForm({
  clients,
  products = [],
}: {
  clients: ClientOption[];
  products?: ProductOption[];
}) {
  const [state, action, pending] = useActionState(createIdentityMembershipAction, { error: null });
  const [clientId, setClientId] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');
  const [roleId, setRoleId] = useState('');
  const available = useMemo(
    () => products.filter((item) => item.clientId === clientId),
    [clientId, products],
  );
  const selected = available.find((item) => item.subscriptionId === subscriptionId);
  const remaining = selected ? selected.licenseLimit - selected.licensesUsed : null;
  const limitReached = remaining !== null && remaining <= 0;
  return (
    <form action={action} className="grid gap-3 rounded-lg border p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h2 className="font-semibold">Cadastrar ou vincular identidade global</h2>
        <p className="text-muted text-xs">
          A identidade e a senha são únicas. Cada empresa concede produtos e perfis separadamente.
          Uma nova conta recebe convite. Contas já ativas não precisam criar outra senha.
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
        <select
          required
          name="clientId"
          value={clientId}
          onChange={(event) => {
            setClientId(event.target.value);
            setSubscriptionId('');
            setRoleId('');
          }}
          className="rounded border p-2"
        >
          <option value="" disabled>Selecione a empresa</option>
          {clients.map((item) => (
            <option key={item.id} value={item.id}>
              {item.trade_name || item.legal_name}
            </option>
          ))}
        </select>
      </label>
      <div className="sm:col-span-2 rounded-md border bg-slate-50 p-3">
        <p className="mb-2 text-sm font-semibold">Autorização de produto</p>
        <p className="mb-3 text-xs text-slate-600">
          Selecione um produto contratado. A licença é reservada ao cadastrar a pessoa,
          inclusive enquanto o convite estiver pendente. Outros produtos podem ser
          concedidos depois no cadastro da identidade.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Produto contratado
            <select
              name="subscriptionId"
              value={subscriptionId}
              onChange={(event) => {
                setSubscriptionId(event.target.value);
                setRoleId('');
              }}
              className="rounded border p-2"
              disabled={!clientId}
            >
              <option value="">Sem produto inicial</option>
              {available.map((item) => (
                <option key={item.subscriptionId} value={item.subscriptionId}>
                  {item.productName} ({Math.max(0, item.licenseLimit - item.licensesUsed)} disponíveis)
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Perfil
            <select
              name="productRoleId"
              value={roleId}
              onChange={(event) => setRoleId(event.target.value)}
              className="rounded border p-2"
              disabled={!selected}
              required={Boolean(selected)}
            >
              <option value="">Selecione o perfil</option>
              {selected?.roles.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
        </div>
        {limitReached ? (
          <p role="alert" className="mt-2 text-sm text-red-700">
            Limite de licenças atingido. Não é possível conceder esse produto.
          </p>
        ) : remaining !== null ? (
          <p className="mt-2 text-sm text-slate-700">
            {remaining} licença(s) disponíveis de {selected?.licenseLimit}.
          </p>
        ) : null}
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2">{state.error}</p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm sm:col-span-2">{state.success}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !clients.length || limitReached || (Boolean(selected) && !roleId)}
        className="rounded bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-60 sm:col-span-2"
      >
        {pending ? 'Salvando...' : 'Cadastrar ou vincular'}
      </button>
    </form>
  );
}

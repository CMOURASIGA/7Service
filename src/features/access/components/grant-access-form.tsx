'use client';

import { useActionState, useMemo, useState } from 'react';

import type { Product, ProductRole, Subscription } from '@/types/domain';

export interface GrantAccessFormState {
  error: string | null;
}

export interface GrantableSubscription {
  subscription: Subscription;
  product: Product;
}

const inputClass =
  'rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100';

export function GrantAccessForm({
  action,
  options,
}: {
  action: (state: GrantAccessFormState, formData: FormData) => Promise<GrantAccessFormState>;
  options: GrantableSubscription[];
}) {
  const [state, formAction, isPending] = useActionState<GrantAccessFormState, FormData>(action, {
    error: null,
  });
  const [subscriptionId, setSubscriptionId] = useState(options[0]?.subscription.id ?? '');

  const roles: ProductRole[] = useMemo(() => {
    const selected = options.find((o) => o.subscription.id === subscriptionId);
    return selected?.product.roles.filter((r) => r.status === 'ACTIVE') ?? [];
  }, [options, subscriptionId]);

  if (options.length === 0) {
    return (
      <p className="text-muted text-sm">
        Nenhuma assinatura disponível para conceder acesso (cadastre uma assinatura no cliente
        primeiro, ou o usuário já possui acesso a todas).
      </p>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-foreground text-sm font-medium" htmlFor="subscriptionId">
          Produto (assinatura)
        </label>
        <select
          id="subscriptionId"
          name="subscriptionId"
          value={subscriptionId}
          onChange={(event) => setSubscriptionId(event.target.value)}
          className={inputClass}
        >
          {options.map(({ subscription, product }) => (
            <option key={subscription.id} value={subscription.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-foreground text-sm font-medium" htmlFor="productRoleId">
          Perfil
        </label>
        <select id="productRoleId" name="productRoleId" required className={inputClass}>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col justify-end gap-1.5">
        <button
          type="submit"
          disabled={isPending || roles.length === 0}
          className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? 'Concedendo...' : 'Conceder acesso'}
        </button>
      </div>

      {state.error ? (
        <p role="alert" className="text-danger text-sm sm:col-span-3">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

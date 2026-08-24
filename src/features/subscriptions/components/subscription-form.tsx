'use client';

import { useActionState } from 'react';

import type { Contract, Product } from '@/types/domain';

export interface SubscriptionFormState {
  error: string | null;
}

const inputClass =
  'rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100';
const labelClass = 'text-sm font-medium text-foreground';

export function SubscriptionForm({
  action,
  contracts,
  products,
}: {
  action: (state: SubscriptionFormState, formData: FormData) => Promise<SubscriptionFormState>;
  contracts: Contract[];
  products: Product[];
}) {
  const [state, formAction, isPending] = useActionState<SubscriptionFormState, FormData>(action, {
    error: null,
  });

  if (contracts.length === 0) {
    return (
      <p className="text-muted text-sm">
        Cadastre um contrato antes de criar uma assinatura de produto.
      </p>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="contractId">
          Contrato
        </label>
        <select id="contractId" name="contractId" required className={inputClass}>
          {contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.reference}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="productId">
          Produto
        </label>
        <select id="productId" name="productId" required className={inputClass}>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="licenseLimit">
          Limite de licenças
        </label>
        <input
          id="licenseLimit"
          name="licenseLimit"
          type="number"
          min={0}
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="startDate">
          Início
        </label>
        <input id="startDate" name="startDate" type="date" required className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="endDate">
          Fim (opcional)
        </label>
        <input id="endDate" name="endDate" type="date" className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="graceDays">
          Carência (dias)
        </label>
        <input
          id="graceDays"
          name="graceDays"
          type="number"
          min={0}
          defaultValue={5}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="monthlyValue">
          Valor mensal
        </label>
        <input
          id="monthlyValue"
          name="monthlyValue"
          type="number"
          min={0}
          step="0.01"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="implementationValue">
          Valor de implantação
        </label>
        <input
          id="implementationValue"
          name="implementationValue"
          type="number"
          min={0}
          step="0.01"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col justify-end gap-1.5">
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? 'Salvando...' : 'Nova assinatura'}
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

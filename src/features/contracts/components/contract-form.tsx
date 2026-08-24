'use client';

import { useActionState } from 'react';

export interface ContractFormState {
  error: string | null;
}

const inputClass =
  'rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100';
const labelClass = 'text-sm font-medium text-foreground';

export function ContractForm({
  action,
}: {
  action: (state: ContractFormState, formData: FormData) => Promise<ContractFormState>;
}) {
  const [state, formAction, isPending] = useActionState<ContractFormState, FormData>(action, {
    error: null,
  });

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="reference">
          Referência
        </label>
        <input id="reference" name="reference" required className={inputClass} />
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
      <div className="flex flex-col justify-end gap-1.5">
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? 'Salvando...' : 'Novo contrato'}
        </button>
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-4">
        <label className={labelClass} htmlFor="notes">
          Observações
        </label>
        <input id="notes" name="notes" className={inputClass} />
      </div>
      {state.error ? (
        <p role="alert" className="text-danger text-sm sm:col-span-4">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

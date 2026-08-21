'use client';

import { useActionState } from 'react';

import type { Client } from '@/types/domain';

export interface ClientFormState {
  error: string | null;
}

interface ClientFormProps {
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  client?: Client;
  submitLabel: string;
}

const inputClass =
  'rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100';
const labelClass = 'text-sm font-medium text-foreground';

export function ClientForm({ action, client, submitLabel }: ClientFormProps) {
  const [state, formAction, isPending] = useActionState<ClientFormState, FormData>(action, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="personType">
            Tipo de pessoa
          </label>
          <select
            id="personType"
            name="personType"
            defaultValue={client?.personType ?? 'PJ'}
            disabled={Boolean(client)}
            className={inputClass}
          >
            <option value="PJ">Pessoa Jurídica (CNPJ)</option>
            <option value="PF">Pessoa Física (CPF)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="document">
            CPF/CNPJ
          </label>
          <input
            id="document"
            name="document"
            required
            defaultValue={client?.document}
            disabled={Boolean(client)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className={labelClass} htmlFor="legalName">
            Razão social / Nome completo
          </label>
          <input
            id="legalName"
            name="legalName"
            required
            defaultValue={client?.legalName}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="tradeName">
            Nome fantasia
          </label>
          <input
            id="tradeName"
            name="tradeName"
            defaultValue={client?.tradeName ?? ''}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="contactName">
            Contato principal
          </label>
          <input
            id="contactName"
            name="contactName"
            defaultValue={client?.contactName ?? ''}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="phone">
            Telefone
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={client?.phone ?? ''}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={client?.email ?? ''}
            className={inputClass}
          />
        </div>
      </section>

      <section>
        <h3 className="text-foreground mb-3 text-sm font-semibold">Endereço</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="postalCode">
              CEP
            </label>
            <input
              id="postalCode"
              name="postalCode"
              defaultValue={client?.address?.postalCode ?? ''}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className={labelClass} htmlFor="street">
              Logradouro
            </label>
            <input
              id="street"
              name="street"
              defaultValue={client?.address?.street ?? ''}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="number">
              Número
            </label>
            <input
              id="number"
              name="number"
              defaultValue={client?.address?.number ?? ''}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="complement">
              Complemento
            </label>
            <input
              id="complement"
              name="complement"
              defaultValue={client?.address?.complement ?? ''}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="district">
              Bairro
            </label>
            <input
              id="district"
              name="district"
              defaultValue={client?.address?.district ?? ''}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="city">
              Cidade
            </label>
            <input
              id="city"
              name="city"
              defaultValue={client?.address?.city ?? ''}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="state">
              Estado
            </label>
            <input
              id="state"
              name="state"
              defaultValue={client?.address?.state ?? ''}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="country">
              País
            </label>
            <input
              id="country"
              name="country"
              defaultValue={client?.address?.country ?? 'BR'}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="notes">
          Observações
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={client?.notes ?? ''}
          className={inputClass}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-danger text-sm">
          {state.error}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand-600 hover:bg-brand-700 rounded-md px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

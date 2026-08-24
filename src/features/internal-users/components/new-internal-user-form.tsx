'use client';

import { useActionState } from 'react';

import type { InternalRole } from '@/types/domain';

import {
  createInternalUserAction,
  type InternalUserFormState,
} from '@/app/(admin)/administracao/operadores/actions';

const inputClass =
  'rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100';

export function NewInternalUserForm({ roles }: { roles: InternalRole[] }) {
  const [state, formAction, isPending] = useActionState<InternalUserFormState, FormData>(
    createInternalUserAction,
    { error: null },
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-foreground text-sm font-medium" htmlFor="firstName">
            Nome
          </label>
          <input id="firstName" name="firstName" required className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-foreground text-sm font-medium" htmlFor="lastName">
            Sobrenome
          </label>
          <input id="lastName" name="lastName" required className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-foreground text-sm font-medium" htmlFor="email">
            E-mail institucional
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-foreground mb-1 text-sm font-medium">Perfis</legend>
        <div className="flex flex-wrap gap-3">
          {roles.map((role) => (
            <label key={role.id} className="text-foreground flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="roleCodes" value={role.code} />
              {role.name}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-danger text-sm">
          {state.error}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? 'Salvando...' : 'Cadastrar operador'}
        </button>
      </div>
    </form>
  );
}

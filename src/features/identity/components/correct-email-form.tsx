'use client';

import { useActionState } from 'react';

type FormState = { error: string | null; success?: string };

export function CorrectPendingEmailForm({
  initialEmail,
  action,
}: {
  initialEmail: string;
  action: (previous: FormState, form: FormData) => Promise<FormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  return (
    <form
      action={formAction}
      className="mt-3 max-w-xl rounded-md border border-amber-200 bg-amber-50 p-4"
    >
      <h2 className="font-semibold">Corrigir e-mail antes da ativação</h2>
      <p className="mt-1 text-sm text-slate-700">
        Corrige o endereço no 7Service e no provedor de autenticação, sem criar outra pessoa. A
        conta precisa estar com convite pendente e nunca ter sido utilizada.
      </p>
      <label htmlFor="correct-email" className="mt-3 block text-sm font-medium">
        Novo e-mail
      </label>
      <input
        id="correct-email"
        name="newEmail"
        type="email"
        required
        defaultValue={initialEmail}
        maxLength={254}
        autoComplete="off"
        className="mt-1 w-full rounded-md border px-3 py-2"
      />
      <label htmlFor="correct-email-reason" className="mt-3 block text-sm font-medium">
        Motivo da correção
      </label>
      <textarea
        id="correct-email-reason"
        name="reason"
        required
        minLength={8}
        rows={2}
        placeholder="Ex.: Erro de digitação no convite original"
        className="mt-1 w-full rounded-md border px-3 py-2"
      />
      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="mt-2 text-sm text-green-700">
          {state.success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="bg-brand-700 mt-3 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? 'Corrigindo...' : 'Salvar correção de e-mail'}
      </button>
    </form>
  );
}

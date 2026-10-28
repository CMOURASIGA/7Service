'use client';
import { useActionState } from 'react';
import { createProductAction } from '@/app/(admin)/produtos/actions';

export function CreateProductForm() {
  const [state, formAction, pending] = useActionState(createProductAction, { error: null });
  return (
    <form action={formAction} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">Cadastrar produto</h2>
      <label className="flex flex-col gap-1 text-sm">
        Codigo unico
        <input
          name="code"
          required
          maxLength={50}
          placeholder="EXEMPLO"
          className="rounded border p-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input name="name" required maxLength={150} className="rounded border p-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Descricao
        <textarea name="description" rows={2} className="rounded border p-2" />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm sm:col-span-2">
          Produto cadastrado.
        </p>
      ) : null}
      <button
        disabled={pending}
        className="rounded bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? 'Salvando...' : 'Cadastrar produto'}
      </button>
    </form>
  );
}

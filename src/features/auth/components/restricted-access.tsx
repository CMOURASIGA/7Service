'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

export function RestrictedAccess() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function switchAccount() {
    if (busy) return;
    setBusy(true);
    await createClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <section className="border-border bg-background w-full max-w-lg rounded-lg border p-8">
        <h1 className="text-foreground text-xl font-semibold">
          Acesso administrativo não autorizado
        </h1>
        <p className="text-muted mt-3 text-sm">
          Esta conta não possui acesso ao painel interno do 7Service. Utilize o link do sistema
          contratado.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={switchAccount}
          className="bg-brand-600 mt-5 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Saindo...' : 'Sair e usar outra conta'}
        </button>
      </section>
    </div>
  );
}

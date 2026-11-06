'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Falha ao encerrar sessão no servidor');
      // The server has already invalidated the Auth session and removed
      // its cookies. Also clear the browser client state before navigating.
      await createClient().auth.signOut({ scope: 'local' });
      router.replace('/login');
      router.refresh();
    } catch {
      setError('Não foi possível encerrar a sessão. Tente novamente.');
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        aria-label="Sair do painel administrativo"
        className="border-border text-foreground hover:bg-bg-muted rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {busy ? 'Saindo...' : 'Sair'}
      </button>
      {error ? (
        <span role="alert" className="text-danger text-xs">
          {error}
        </span>
      ) : null}
      {busy ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-white"
        >
          <p className="text-foreground text-base font-medium">Encerrando sessão...</p>
        </div>
      ) : null}
    </div>
  );
}

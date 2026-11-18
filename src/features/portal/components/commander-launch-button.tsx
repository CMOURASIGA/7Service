'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function CommanderLaunchButton({ targetOrigin }: { targetOrigin: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function open() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const destination = new URL('/api/auth/portal-entry', targetOrigin);
      if (
        destination.protocol !== 'https:' ||
        destination.username ||
        destination.password ||
        destination.search ||
        destination.hash
      )
        throw new Error('Endereço do Commander não autorizado.');
      const supabase = createClient();
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.access_token)
        throw new Error('Sessão expirada. Faça login novamente no Meu Portal.');
      const verified = await supabase.auth.getUser();
      if (verified.error || !verified.data.user || verified.data.user.id !== data.session.user.id)
        throw new Error('Não foi possível confirmar sua identidade.');
      // POST only, never insert access tokens in the URL, query string,
      // local storage or navigation history.
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = destination.href;
      form.style.display = 'none';
      const field = document.createElement('input');
      field.type = 'hidden';
      field.name = 'centralAccessToken';
      field.value = data.session.access_token;
      form.appendChild(field);
      document.body.appendChild(form);
      form.submit();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Falha ao abrir o Commander.');
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void open()}
        className="w-full rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
      >
        {busy ? 'Confirmando acesso...' : 'Acessar Commander'}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

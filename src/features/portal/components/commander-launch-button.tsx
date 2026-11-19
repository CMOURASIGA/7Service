'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function CommanderLaunchButton({ targetOrigin }: { targetOrigin: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const activeRef = useRef(false);

  function open() {
    if (activeRef.current) return;
    setError('');
    let origin: string;
    try {
      const target = new URL(targetOrigin);
      if (
        target.protocol !== 'https:' ||
        target.username ||
        target.password ||
        target.pathname !== '/' ||
        target.search ||
        target.hash
      )
        throw new Error('Origem do Commander inválida.');
      origin = target.origin;
    } catch {
      setError('Endereço do Commander não autorizado.');
      return;
    }
    // Opening through an immediate click keeps browser popup protection
    // satisfied. Protected Vercel previews authenticate on GET, not POST.
    const popup = window.open(origin + '/portal-start', '_blank');
    if (!popup) {
      setError('O navegador bloqueou a abertura do Commander. Permita a nova aba.');
      return;
    }
    activeRef.current = true;
    setBusy(true);
    const cleanup = () => {
      window.removeEventListener('message', receive);
      activeRef.current = false;
      setBusy(false);
    };
    const receive = async (event: MessageEvent) => {
      if (
        event.origin !== origin ||
        event.source !== popup ||
        !event.data ||
        event.data.type !== 'COMMANDER_PORTAL_READY'
      )
        return;
      // Only one verified transfer per launch.
      window.removeEventListener('message', receive);
      try {
        const supabase = createClient();
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session?.access_token)
          throw new Error('Sessão expirada. Faça login novamente no Meu Portal.');
        const verified = await supabase.auth.getUser();
        if (verified.error || !verified.data.user || verified.data.user.id !== data.session.user.id)
          throw new Error('Não foi possível confirmar sua identidade.');
        popup.postMessage(
          {
            type: 'SEVENSERVICE_CENTRAL_SESSION',
            accessToken: data.session.access_token,
          },
          origin,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha na sessão central.');
        popup.close();
      } finally {
        cleanup();
      }
    };
    window.addEventListener('message', receive);
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={open}
        className="w-full rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60"
      >
        {busy ? 'Abrindo Commander...' : 'Acessar Commander'}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

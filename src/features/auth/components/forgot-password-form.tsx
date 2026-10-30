'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const redirectTo = `${window.location.origin}/redefinir-senha`;
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setBusy(false);
    if (resetError) {
      setError('Não foi possível solicitar a recuperação. Tente novamente mais tarde.');
      return;
    }
    // Generic response deliberately does not confirm account existence.
    setSent(true);
  }
  return (
    <section className="w-full max-w-sm space-y-5 rounded-lg border p-7">
      <h1 className="text-xl font-semibold">Recuperar acesso</h1>
      {sent ? (
        <p role="status" className="text-sm">
          Se o e-mail possuir uma conta, você receberá instruções para redefinir sua senha.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            E-mail
            <input
              type="email"
              autoComplete="email"
              className="rounded border p-2"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>
        </form>
      )}
      <Link href="/login" className="text-sm text-blue-700 underline">
        Voltar ao login
      </Link>
    </section>
  );
}

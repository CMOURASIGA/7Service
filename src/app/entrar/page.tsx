'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function enter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    const supabase = createClient();
    const result = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setPending(false);
    if (result.error) {
      setError('Não foi possível autenticar. Confira e-mail e senha.');
      return;
    }
    router.replace('/meus-sistemas');
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <form onSubmit={enter} className="flex w-full max-w-md flex-col gap-4 rounded-lg border p-7">
        {/* prettier-ignore */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem local, identidade do produto */}
          <img src="/product-icons/access-management-service.svg" alt="" width={52} height={52} className="rounded-xl" />
          <h1 className="text-xl font-semibold">Entrar no Meu Portal</h1>
        </div>
        <p className="text-sm text-slate-600">
          Utilize a identidade e a senha que ativou no Access Management Service. O portal mostra
          somente os produtos autorizados para suas empresas.
        </p>
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded border p-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded border p-2"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-700 p-2 text-white disabled:opacity-60"
        >
          {pending ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}

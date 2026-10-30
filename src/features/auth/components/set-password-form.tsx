'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SetPasswordForm({ mode }: { mode: 'invite' | 'recovery' }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    async function validateSession() {
      // Browser client processes token fragments returned by Supabase Auth,
      // as well as a server-established session from /auth/confirm.
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!mounted) return;
      setValidSession(!authError && !!user);
      setReady(true);
    }
    void validateSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setValidSession(true);
        setReady(true);
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !validSession) return;
    setError('');
    if (password.length < 12) {
      setError('A senha deve conter pelo menos 12 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas informadas não coincidem.');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setError('Sua sessão expirou. Solicite um novo link.');
      setSaving(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('Não foi possível definir a senha. Verifique as regras de segurança ou solicite um novo link.');
      setSaving(false);
      return;
    }
    await supabase.auth.signOut();
    router.replace('/login?password_updated=1');
    router.refresh();
  }

  if (!ready) return <p role="status" className="text-sm">Validando seu convite...</p>;
  if (!validSession) {
    return <div className="space-y-3">
      <p role="alert" className="text-sm text-red-700">Link inválido ou expirado. Abra o link completo do e-mail ou solicite um novo acesso.</p>
      <Link className="text-blue-700 underline" href="/esqueci-senha">Solicitar recuperação de senha</Link>
    </div>;
  }
  return <form onSubmit={submit} className="flex flex-col gap-4">
    <h1 className="text-xl font-semibold">{mode === 'invite' ? 'Definir senha de acesso' : 'Redefinir senha'}</h1>
    <p className="text-sm text-gray-600">Crie uma senha de pelo menos 12 caracteres para seu acesso ao 7Service.</p>
    <label className="flex flex-col gap-1 text-sm">Nova senha
      <input type="password" autoComplete="new-password" minLength={12} required
        className="rounded border p-2" value={password} onChange={(e) => setPassword(e.target.value)} />
    </label>
    <label className="flex flex-col gap-1 text-sm">Confirmar nova senha
      <input type="password" autoComplete="new-password" minLength={12} required
        className="rounded border p-2" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
    </label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button type="submit" disabled={saving} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
      {saving ? 'Salvando...' : 'Salvar senha'}
    </button>
  </form>;
}

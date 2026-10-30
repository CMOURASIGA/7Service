'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { passwordValidationError } from '@/lib/auth/password-rules';

export function SetPasswordForm({ mode }: { mode: 'invite' | 'recovery' }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    async function validateSession() {
      // Browser client processes token fragments returned by Supabase Auth,
      // as well as a server-established session from /auth/confirm.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (!mounted) return;
      setValidSession(!authError && !!user);
      setReady(true);
    }
    void validateSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setValidSession(true);
        setReady(true);
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function verifyEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (verifying) return;
    const email = otpEmail.trim().toLowerCase();
    const token = otpCode.trim();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || !/^\\d{6,8}$/.test(token)) {
      setError('Informe o e-mail e o código recebido, de 6 a 8 dígitos.');
      return;
    }
    setError('');
    setVerifying(true);
    const { data, error: verifyError } = await createClient().auth.verifyOtp({
      email,
      token,
      type: mode === 'invite' ? 'invite' : 'recovery',
    });
    setVerifying(false);
    if (verifyError || !data.user) {
      setError('Código inválido ou expirado. Solicite outro código quando o envio estiver disponível.');
      return;
    }
    setValidSession(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !validSession) return;
    setError('');
    const passwordError = passwordValidationError(password, confirmPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      setError('Sua sessão expirou. Solicite um novo link.');
      setSaving(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(
        'Não foi possível definir a senha. Verifique as regras de segurança ou solicite um novo link.',
      );
      setSaving(false);
      return;
    }
    await supabase.auth.signOut();
    router.replace('/login?password_updated=1');
    router.refresh();
  }

  if (!ready)
    return (
      <p role="status" className="text-sm">
        Validando seu convite...
      </p>
    );
  if (!validSession) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-sm text-gray-700">
          Se o link expirou, informe o código temporário recebido por e-mail.
          Esta opção requer um modelo de e-mail configurado com código OTP.
        </p>
        <form onSubmit={verifyEmailCode} className="space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            E-mail
            <input type="email" required autoComplete="email" className="rounded border p-2"
              value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Código de verificação
            <input type="text" inputMode="numeric" required pattern="[0-9]{6,8}"
              autoComplete="one-time-code" className="rounded border p-2"
              value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={verifying}
            className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
            {verifying ? 'Validando...' : 'Validar código'}
          </button>
        </form>
        <Link className="block text-sm text-blue-700 underline" href="/esqueci-senha">
          Solicitar recuperação de senha
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">
        {mode === 'invite' ? 'Definir senha de acesso' : 'Redefinir senha'}
      </h1>
      <p className="text-sm text-gray-600">
        Crie uma senha de pelo menos 12 caracteres para seu acesso ao 7Service.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Nova senha
        <input
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className="rounded border p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Confirmar nova senha
        <input
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className="rounded border p-2"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
      >
        {saving ? 'Salvando...' : 'Salvar senha'}
      </button>
    </form>
  );
}

'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { passwordValidationError } from '@/lib/auth/password-rules';
import { isValidEmailOtp } from '@/lib/auth/email-otp-validation';

export function SetPasswordForm({ mode }: { mode: 'invite' | 'recovery' }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [inviteAccount, setInviteAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    // A custom Supabase mail template or an old invitation can still contain
    // a protected Vercel preview URL. Move the full URL, including the query
    // and hash tokens, to the public portal before initializing Auth.
    // Never let customers set their password under a preview origin.
    if (/^7service-git-[a-z0-9-]+\.vercel\.app$/i.test(window.location.hostname)) {
      const target = new URL(window.location.href);
      target.host = 'portal.consultservices.com.br';
      window.location.replace(target.toString());
      return;
    }
    // An expired invitation must not silently reuse a different account's
    // previously authenticated browser session.
    const queryError = new URLSearchParams(window.location.search).get('error');
    const fragmentError = new URLSearchParams(window.location.hash.slice(1)).get('error');
    if (queryError || fragmentError) {
      void Promise.resolve().then(() => {
        setValidSession(false);
        setReady(true);
      });
      return;
    }
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
      if (authError || !user) {
        setValidSession(false);
      } else if (mode === 'invite') {
        const check = await fetch('/api/auth/invite-eligibility', { cache: 'no-store' });
        const eligibility = (await check.json().catch(() => null)) as {
          eligible?: boolean;
          email?: string;
        } | null;
        if (!mounted) return;
        setValidSession(check.ok && eligibility?.eligible === true);
        setInviteAccount(check.ok ? (eligibility?.email ?? '') : '');
      } else {
        setValidSession(true);
      }
      setReady(true);
    }
    void validateSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      // USER_UPDATED is fired when the invited user sets a password.
      // Rechecking invite eligibility at that point races with activation:
      // a successfully activated identity is no longer PENDING_INVITE.
      // Never replace the password screen with the OTP screen for this event.
      if (event === 'SIGNED_OUT') {
        setValidSession(false);
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
    if (!isValidEmailOtp(email, token)) {
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
      setError(
        'Código inválido ou expirado. Solicite outro código quando o envio estiver disponível.',
      );
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
    if (mode === 'invite') {
      const check = await fetch('/api/auth/invite-eligibility', { cache: 'no-store' });
      const result = (await check.json().catch(() => null)) as {
        eligible?: boolean;
        email?: string;
      } | null;
      if (
        !check.ok ||
        result?.eligible !== true ||
        result.email?.toLowerCase() !== user.email?.toLowerCase()
      ) {
        setError(
          'Esta sessão não corresponde a um convite pendente. Saia da conta atual e abra o convite em uma janela privativa.',
        );
        setValidSession(false);
        setSaving(false);
        return;
      }
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(
        'Não foi possível definir a senha. Verifique as regras de segurança ou solicite um novo link.',
      );
      setSaving(false);
      return;
    }
    // Identity activation is separate from authentication and never creates
    // an internal/admin role. For recovery of an internal operator, absence
    // of a customer identity is expected and does not block password reset.
    let activated = false;
    try {
      const activation = await fetch('/api/auth/activate', { method: 'POST' });
      activated = activation.ok;
    } catch {
      activated = false;
    }
    if (mode === 'invite' && !activated) {
      setError(
        'Senha definida, mas a ativação da identidade não foi confirmada. Contate a Consult Services.',
      );
      setSaving(false);
      return;
    }
    if (mode === 'invite') {
      // Keep the verified customer session and open the restricted product
      // catalog. No administrative access and no product entitlement inferred.
      router.replace('/meus-sistemas');
      router.refresh();
      return;
    }
    // Customer recovery must return to the customer portal, never the
    // internal administrator login. Only internal operators use that login.
    // A failed permission check is not grounds to grant administrator access.
    let internalStatus: number | null = null;
    try {
      const result = await fetch('/api/auth/internal-access', {
        credentials: 'same-origin', cache: 'no-store',
      });
      internalStatus = result.status;
    } catch {
      // Remain in the authenticated customer session, fail closed for admin.
    }
    if (internalStatus === 200) {
      await supabase.auth.signOut();
      router.replace('/login?password_updated=1');
    } else {
      router.replace('/meus-sistemas');
    }
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
          Se o link expirou, informe o código temporário recebido por e-mail. Esta opção requer um
          modelo de e-mail configurado com código OTP.
        </p>
        <form onSubmit={verifyEmailCode} className="space-y-3">
          <label className="flex flex-col gap-1 text-sm">
            E-mail
            <input
              type="email"
              required
              autoComplete="email"
              className="rounded border p-2"
              value={otpEmail}
              onChange={(e) => setOtpEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Código de verificação
            <input
              type="text"
              inputMode="numeric"
              required
              pattern="[0-9]{6,8}"
              autoComplete="one-time-code"
              className="rounded border p-2"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={verifying}
            className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
          >
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
      {mode === 'invite' && inviteAccount ? (
        <p className="rounded border border-blue-200 bg-blue-50 p-2 text-sm">
          Convite destinado a: <strong>{inviteAccount}</strong>
        </p>
      ) : null}
      <p className="text-sm text-gray-600">
        Crie uma senha de pelo menos 12 caracteres para seu acesso ao Access Management Service.
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

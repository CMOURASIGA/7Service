import Link from 'next/link';
import { Suspense } from 'react';

import { isSupabaseConfigured } from '@/config/env';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata = {
  title: 'Entrar - 7Service',
};

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="bg-brand-50/40 flex flex-1 items-center justify-center p-4">
      <div className="border-border bg-background w-full max-w-sm rounded-lg border p-8 shadow-sm">
        <h1 className="text-foreground mb-1 text-xl font-semibold">7Service</h1>
        <p className="text-muted mb-6 text-sm">Acesso administrativo interno Consult Services</p>

        {configured ? (
          <Suspense>
            <LoginForm />
          </Suspense>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-warning rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
              O projeto Supabase ainda não foi provisionado, então não há autenticação real para
              validar aqui. Você está navegando em modo demonstração, sempre como o operador
              SUPER_ADMIN de exemplo — assim que o Supabase for configurado, este formulário passa a
              exigir login de verdade automaticamente.
            </p>
            <Link
              href="/"
              className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2 text-center text-sm font-medium text-white"
            >
              Continuar em modo demonstração
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

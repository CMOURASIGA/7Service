import { Suspense } from 'react';

import { LoginForm } from '@/features/auth/components/login-form';

export const metadata = {
  title: 'Entrar - 7Service',
};

export default function LoginPage() {
  return (
    <div className="bg-brand-50/40 flex flex-1 items-center justify-center p-4">
      <div className="border-border bg-background w-full max-w-sm rounded-lg border p-8 shadow-sm">
        <h1 className="text-foreground mb-1 text-xl font-semibold">7Service</h1>
        <p className="text-muted mb-6 text-sm">Acesso administrativo interno Consult Services</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

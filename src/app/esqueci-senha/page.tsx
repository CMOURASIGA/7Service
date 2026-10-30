import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
export const metadata = { title: 'Recuperar acesso - 7Service' };
export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <ForgotPasswordForm />
    </main>
  );
}

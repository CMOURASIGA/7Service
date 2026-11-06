import { SetPasswordForm } from '@/features/auth/components/set-password-form';
export const metadata = { title: 'Redefinir senha - 7Service' };
export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <section className="w-full max-w-md rounded-lg border p-7">
        <SetPasswordForm mode="recovery" />
      </section>
    </main>
  );
}

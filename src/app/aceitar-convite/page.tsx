import { SetPasswordForm } from '@/features/auth/components/set-password-form';
export const metadata = { title: 'Aceitar convite - 7Service' };
export default function AcceptInvitePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <section className="w-full max-w-md rounded-lg border p-7">
        <SetPasswordForm mode="invite" />
      </section>
    </main>
  );
}

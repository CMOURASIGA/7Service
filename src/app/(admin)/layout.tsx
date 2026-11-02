import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { RestrictedAccess } from '@/features/auth/components/restricted-access';
import { isAppError } from '@/lib/errors';
import { getCurrentSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    const session = await getCurrentSession();
    return <AppShell user={session.internalUser}>{children}</AppShell>;
  } catch (error) {
    if (isAppError(error) && (error.code === 'FORBIDDEN' || error.code === 'UNAUTHENTICATED')) {
      return <RestrictedAccess />;
    }
    throw error;
  }
}

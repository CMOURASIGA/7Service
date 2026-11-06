import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { RestrictedAccess } from '@/features/auth/components/restricted-access';
import { isAppError } from '@/lib/errors';
import { getCurrentSession, type CurrentSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  let session: CurrentSession | null = null;
  try {
    session = await getCurrentSession();
  } catch (error) {
    if (!isAppError(error) || (error.code !== 'FORBIDDEN' && error.code !== 'UNAUTHENTICATED')) {
      throw error;
    }
  }

  if (!session) return <RestrictedAccess />;
  return <AppShell user={session.internalUser}>{children}</AppShell>;
}

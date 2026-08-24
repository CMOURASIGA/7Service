import type { ReactNode } from 'react';

import { isSupabaseConfigured } from '@/config/env';
import type { InternalUser } from '@/types/domain';

import { ShellClient } from './shell-client';

export function AppShell({ user, children }: { user: InternalUser; children: ReactNode }) {
  return (
    <ShellClient user={user} showDemoBanner={!isSupabaseConfigured()}>
      {children}
    </ShellClient>
  );
}

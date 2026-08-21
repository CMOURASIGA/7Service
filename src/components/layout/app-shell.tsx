import type { ReactNode } from 'react';

import { isSupabaseConfigured } from '@/config/env';
import type { InternalUser } from '@/types/domain';

import { DemoModeBanner } from './demo-mode-banner';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AppShell({ user, children }: { user: InternalUser; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      {!isSupabaseConfigured() ? <DemoModeBanner /> : null}
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar user={user} />
          <main className="flex-1 bg-slate-50/50 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import type { InternalUser } from '@/types/domain';

import { DemoModeBanner } from './demo-mode-banner';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function ShellClient({
  user,
  showDemoBanner,
  children,
}: {
  user: InternalUser;
  showDemoBanner: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Fecha a gaveta mobile automaticamente ao trocar de rota. Ajustar estado
  // durante a renderização (em vez de useEffect) evita o re-render em
  // cascata: https://react.dev/learn/you-might-not-need-an-effect
  const [renderedPathname, setRenderedPathname] = useState(pathname);
  if (pathname !== renderedPathname) {
    setRenderedPathname(pathname);
    setMobileNavOpen(false);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {showDemoBanner ? <DemoModeBanner /> : null}
      <div className="min-h-full md:flex md:items-stretch">
        <Sidebar isMobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar
            user={user}
            onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)}
            mobileNavOpen={mobileNavOpen}
          />
          <main className="bg-bg-muted/40 flex-1 overflow-x-hidden p-4 md:p-5">{children}</main>
        </div>
      </div>
    </div>
  );
}

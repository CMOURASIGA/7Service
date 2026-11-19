'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import type { InternalUser } from '@/types/domain';

import { DemoModeBanner } from './demo-mode-banner';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

const SIDEBAR_PREFERENCE = '7service.sidebar.compact.v1';

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
  const [compactSidebar, setCompactSidebar] = useState(false);
  const [renderedPathname, setRenderedPathname] = useState(pathname);

  useEffect(() => {
    const handle = window.requestAnimationFrame(() => {
      try {
        setCompactSidebar(window.localStorage.getItem(SIDEBAR_PREFERENCE) === 'true');
      } catch {
        // Private browsing/storage errors fall back to the predictable expanded shell.
      }
    });
    return () => window.cancelAnimationFrame(handle);
  }, []);

  if (pathname !== renderedPathname) {
    setRenderedPathname(pathname);
    setMobileNavOpen(false);
  }

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  function toggleCompactSidebar() {
    const next = !compactSidebar;
    setCompactSidebar(next);
    try {
      window.localStorage.setItem(SIDEBAR_PREFERENCE, String(next));
    } catch {
      // Preference-only storage cannot block navigation.
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {showDemoBanner ? <DemoModeBanner /> : null}
      <div
        className="min-h-full min-w-0 md:flex md:items-stretch"
        data-sidebar-mode={compactSidebar ? 'compact' : 'expanded'}
      >
        <Sidebar
          isMobileOpen={mobileNavOpen}
          onCloseMobile={closeMobileNav}
          compact={compactSidebar}
          onToggleCompact={toggleCompactSidebar}
        />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar
            user={user}
            onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)}
            mobileNavOpen={mobileNavOpen}
          />
          <main className="bg-bg-muted/40 min-w-0 flex-1 overflow-x-hidden p-4 md:p-5">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

'use client';

import { usePathname } from 'next/navigation';

import { isSupabaseConfigured } from '@/config/env';
import type { InternalUser } from '@/types/domain';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/clientes': 'Clientes',
  '/clientes/novo': 'Novo cliente',
  '/usuarios': 'Usuários',
  '/produtos': 'Produtos',
  '/licenciamento': 'Licenciamento',
  '/convites': 'Convites',
  '/auditoria': 'Auditoria',
  '/administracao/operadores': 'Administração interna',
};

function pageTitleFor(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const match = Object.keys(PAGE_TITLES)
    .filter((key) => key !== '/' && pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLES[match] : 'Workspace';
}

function initialsFor(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '7S';
}

export function Topbar({
  user,
  onToggleMobileNav,
  mobileNavOpen,
}: {
  user: InternalUser;
  onToggleMobileNav: () => void;
  mobileNavOpen: boolean;
}) {
  const pathname = usePathname();
  const pageTitle = pageTitleFor(pathname);
  const configured = isSupabaseConfigured();

  return (
    <header className="border-border flex h-14 items-center justify-between gap-3 border-b bg-white/92 px-4 backdrop-blur md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileNav}
          aria-label={mobileNavOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileNavOpen}
          className="mobile-nav-toggle"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="text-brand-600 text-[10px] font-black tracking-[0.2em] uppercase">
            Painel administrativo
          </p>
          <h1 className="text-foreground truncate text-base font-medium">{pageTitle}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={
            configured
              ? 'border-success/30 bg-success-soft text-success hidden items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-medium md:inline-flex'
              : 'border-warning/30 bg-warning-soft text-warning hidden items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-medium md:inline-flex'
          }
        >
          <span className={`h-2 w-2 rounded-full ${configured ? 'bg-success' : 'bg-warning'}`} />
          {configured ? 'Operacional' : 'Modo demonstração'}
        </span>
        <span className="text-muted hidden text-[13px] md:inline">
          {user.firstName} {user.lastName} · {user.roleCodes.join(', ')}
        </span>
        <span className="bg-brand-600 inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold text-white">
          {initialsFor(user.firstName, user.lastName)}
        </span>
      </div>
    </header>
  );
}

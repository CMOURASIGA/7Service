'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { BRAND_LOGO_URL, BRAND_NAME, BRAND_SUBTITLE, COMPANY_NAME } from '@/lib/brand';

/**
 * Menu principal (docs/02-design/NAVIGATION.md), agrupado em seções e com
 * ícones — mesmo padrão de navegação do 7Commander (referência oficial de
 * shell da família Consult Services), com os itens próprios do 7Service.
 */
const NAV_ITEMS = [
  { section: 'Principal', href: '/', label: 'Dashboard', icon: 'home' as const },
  { section: 'Dados', href: '/clientes', label: 'Clientes', icon: 'clients' as const },
  { section: 'Dados', href: '/usuarios', label: 'Usuários', icon: 'users' as const },
  { section: 'Dados', href: '/produtos', label: 'Produtos', icon: 'products' as const },
  { section: 'Dados', href: '/licenciamento', label: 'Licenciamento', icon: 'license' as const },
  { section: 'Dados', href: '/convites', label: 'Convites', icon: 'invite' as const },
  { section: 'Sistema', href: '/auditoria', label: 'Auditoria', icon: 'audit' as const },
  {
    section: 'Sistema',
    href: '/administracao/operadores',
    label: 'Administração',
    icon: 'admin' as const,
  },
];

type IconName = (typeof NAV_ITEMS)[number]['icon'];

const ICON_PATHS: Record<IconName, ReactNode> = {
  home: <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-8.5Z" />,
  clients: (
    <>
      <path d="M4 20.5V17a4 4 0 0 1 4-4h1" />
      <rect x="9" y="4" width="11" height="16.5" rx="1.4" />
      <path d="M13 8h3M13 11.5h3M13 15h3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 6" />
      <path d="M15 14.2c2.9.4 4.9 2.4 5.5 5.8" />
    </>
  ),
  products: (
    <>
      <path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
    </>
  ),
  license: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l7-7" />
      <path d="M16 7l2 2" />
      <path d="M19 4l1 1" />
    </>
  ),
  invite: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.6" />
      <path d="m4 6.5 8 6.5 8-6.5" />
    </>
  ),
  audit: (
    <>
      <path d="M12 3.5 5 6.3V11c0 4.7 2.9 8.2 7 9.5 4.1-1.3 7-4.8 7-9.5V6.3L12 3.5Z" />
      <path d="m9.3 12.2 1.9 1.9 3.6-3.9" />
    </>
  ),
  admin: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.6a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10c.4.3.9.5 1.6.5H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.1Z" />
    </>
  ),
};

function NavIcon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

export function Sidebar({
  isMobileOpen,
  onCloseMobile,
}: {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const sections = Array.from(new Set(NAV_ITEMS.map((item) => item.section)));

  return (
    <>
      {isMobileOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="sidebar-backdrop"
          onClick={onCloseMobile}
        />
      ) : null}
      <aside
        className={[
          'sidebar-shell overflow-y-auto border-white/15 md:min-h-screen md:self-stretch md:border-r',
          isMobileOpen ? 'is-open' : '',
        ].join(' ')}
      >
        <div className="sidebar-brand-panel relative">
          <div className="sidebar-brand-logo-frame">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo remoto (whitelabel-ready), sem domínio fixo configurável em next/image */}
            <img src={BRAND_LOGO_URL} alt={COMPANY_NAME} className="sidebar-brand-logo" />
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="sidebar-close sidebar-rail-only absolute top-3 right-3 md:hidden"
            aria-label="Fechar menu"
          >
            ×
          </button>
        </div>
        <div className="sidebar-product sidebar-rail-only relative">
          <p className="sidebar-product-name">{BRAND_NAME}</p>
          <p className="sidebar-product-subtitle">{BRAND_SUBTITLE}</p>
          <p className="sidebar-product-owner">Uma plataforma {COMPANY_NAME}</p>
        </div>

        <nav className="relative mt-5 flex flex-col gap-5 px-3 pb-5">
          {sections.map((section) => (
            <div key={section}>
              <p className="sidebar-section-label sidebar-rail-only mb-2 px-2">{section}</p>
              <div className="flex flex-col gap-2">
                {NAV_ITEMS.filter((item) => item.section === section).map((item) => {
                  const isActive =
                    item.href === '/' ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      aria-current={isActive ? 'page' : undefined}
                      className={[
                        'sidebar-nav-link flex items-center gap-3 rounded-lg px-3 py-[9px] text-sm font-medium transition-colors md:justify-center lg:justify-start',
                        isActive ? 'sidebar-nav-link-active shadow-sm' : '',
                      ].join(' ')}
                    >
                      <NavIcon name={item.icon} />
                      <span className="sidebar-rail-only">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

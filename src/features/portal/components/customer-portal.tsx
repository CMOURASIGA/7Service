'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { WorkspaceTabs } from '@/components/ui/workspace-tabs';
import { CommanderLaunchButton } from '@/features/portal/components/commander-launch-button';

export type PortalSystem = {
  company: string;
  product: string;
  productCode: string;
  role: string;
  status: 'ACTIVE' | 'PENDING' | 'REVOKED';
};

/** Product marks are distinct from the tenant's whitelabel brand.
 * The Commander mark is copied unchanged from its own app/icon.tsx source.
 * Unknown products use a neutral application glyph, never a made-up initial.
 */
// prettier-ignore
function ProductIcon({ productCode, productName }: { productCode: string; productName: string }) {
  if (productCode === 'COMMANDER7') {
    return (
      <Image
        src="/product-icons/commander.svg"
        alt={'Ícone do ' + productName}
        width={48}
        height={48}
        className="size-12 rounded-xl bg-white object-contain"
        unoptimized
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={'Ícone genérico de ' + productName}
      className="flex size-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700"
    >
      <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.3" />
        <rect x="14" y="3" width="7" height="7" rx="1.3" />
        <rect x="3" y="14" width="7" height="7" rx="1.3" />
        <rect x="14" y="14" width="7" height="7" rx="1.3" />
      </svg>
    </span>
  );
}

function stateOf(system: PortalSystem) {
  if (system.status === 'REVOKED') return 'Acesso revogado';
  if (system.status === 'PENDING') return 'Licença reservada';
  return 'Pronto para entrar';
}

function useGreeting() {
  const [greeting, setGreeting] = useState('Olá');
  useEffect(() => {
    const hour = new Date().getHours();
    const frame = window.requestAnimationFrame(() => {
      setGreeting(hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite');
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return greeting;
}

// prettier-ignore
export function CustomerPortal({
  firstName,
  systems,
  commanderOrigin,
}: {
  firstName: string;
  systems: PortalSystem[];
  commanderOrigin: string | null;
}) {
  const greeting = useGreeting();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<PortalSystem | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const companies = useMemo(() => [...new Set(systems.map((item) => item.company))], [systems]);
  const authorized = systems.filter((item) => item.status === 'ACTIVE');
  const getKey = (item: PortalSystem) => item.company + ':' + item.productCode;
  const featured = authorized.find((item) => getKey(item) === last) ?? authorized[0];

  useEffect(() => {
    // Local preference only. Server-side grants remain the access authority.
    const frame = window.requestAnimationFrame(() => {
      setLast(window.localStorage.getItem('consult-portal-last-product'));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        returnFocus.current = document.activeElement as HTMLElement;
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setDetail(null);
        returnFocus.current?.focus();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  function remember(item: PortalSystem) {
    if (item.status !== 'ACTIVE') return;
    const key = getKey(item);
    setLast(key);
    window.localStorage.setItem('consult-portal-last-product', key);
  }
  function openSearch() {
    returnFocus.current = document.activeElement as HTMLElement;
    setSearchOpen(true);
  }
  function openDetail(item: PortalSystem) {
    returnFocus.current = document.activeElement as HTMLElement;
    setDetail(item);
  }
  function closeOverlay() {
    setDetail(null);
    setSearchOpen(false);
    returnFocus.current?.focus();
  }
  function launch(item: PortalSystem) {
    return item.status === 'ACTIVE' && item.productCode === 'COMMANDER7' && commanderOrigin ? (
      <div onClick={() => remember(item)}>
        <CommanderLaunchButton targetOrigin={commanderOrigin} />
      </div>
    ) : (
      <span className="inline-flex min-h-11 items-center rounded-lg border border-border bg-bg-muted px-4 text-sm text-muted">
        {item.status === 'REVOKED'
          ? 'Falar com o administrador'
          : item.status === 'PENDING'
            ? 'Aguardando ativação'
            : 'Integração de entrada pendente'}
      </span>
    );
  }
  function card(item: PortalSystem) {
    const disabled = item.status !== 'ACTIVE';
    return (
      <article
        key={getKey(item)}
        className="flex min-h-64 flex-col justify-between gap-5 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)]"
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <ProductIcon productCode={item.productCode} productName={item.product} />
            <span
              className={
                'rounded-full px-3 py-1 text-xs font-semibold ' +
                (disabled ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success')
              }
            >
              {stateOf(item)}
            </span>
          </div>
          <h3 className="text-xl font-semibold text-foreground">{item.product}</h3>
          <p className="text-sm text-muted">{item.company} · {item.role}</p>
          <p className="text-sm leading-6 text-muted">
            {item.productCode === 'COMMANDER7'
              ? 'Gestão de projetos e operações.'
              : 'Sistema disponível no catálogo da sua empresa.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">{launch(item)}</div>
          <button
            type="button"
            onClick={() => openDetail(item)}
            aria-label={'Detalhes de ' + item.product + ' em ' + item.company}
            className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            Detalhes
          </button>
        </div>
      </article>
    );
  }
  function panel(items: PortalSystem[]) {
    return items.length ? (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(card)}</div>
    ) : (
      <div className="rounded-2xl border border-dashed border-border bg-white p-8">
        <h3 className="text-lg font-semibold">Nenhum sistema nesta categoria</h3>
        <p className="mt-2 text-sm text-muted">
          Os produtos dependem das autorizações e dos vínculos definidos pela sua empresa.
        </p>
      </div>
    );
  }
  const tabs = [
    { id: 'all', label: 'Todos', content: panel(systems) },
    ...companies.map((company, index) => ({
      id: 'company-' + index,
      label: company,
      content: panel(systems.filter((item) => item.company === company)),
    })),
  ];
  const matches = systems.filter((item) =>
    (item.product + ' ' + item.company).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')),
  );

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-7 px-4 pb-10 sm:px-6">
      <header className="-mx-4 flex items-center gap-4 bg-sidebar px-5 py-4 text-white sm:-mx-6">
        <div className="flex size-10 items-center justify-center rounded-lg bg-white font-bold text-brand-700" aria-hidden="true">CS</div>
        <div>
          <p className="font-semibold">Consult Services</p>
          <p className="text-xs text-blue-100">Access Management Service · Meu Portal</p>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={openSearch}
          aria-label="Buscar sistema, atalho Control K"
          className="min-h-11 rounded-lg border border-white/30 px-3 text-sm text-white focus-visible:outline-2"
        >
          Buscar <span className="hidden sm:inline">sistema · Ctrl+K</span>
        </button>
      </header>

      <section className="grid gap-6 rounded-2xl bg-sidebar-deep px-6 py-8 text-white md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{greeting}, {firstName}.</h1>
          <p className="mt-3 text-sm leading-6 text-blue-100">
            {featured ? 'Seus sistemas estão prontos. Entre direto de onde parou.' :
              'Aqui você encontra seus sistemas e as informações de acesso.'}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 text-foreground">
          {featured ? (
            <>
              <p className="text-xs font-semibold tracking-wider text-muted uppercase">Sistema em destaque</p>
              <div className="mt-3 flex items-center gap-3">
                <ProductIcon productCode={featured.productCode} productName={featured.product} />
                <h2 className="text-2xl font-semibold">{featured.product}</h2>
              </div>
              <p className="mt-2 text-sm text-muted">{featured.company} · {featured.role}</p>
              <p className="my-4 text-sm text-success">Pronto para entrar</p>
              {launch(featured)}
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Nenhum sistema liberado</h2>
              <p className="mt-2 text-sm text-muted">
                Consulte o administrador da empresa para verificar suas licenças.
              </p>
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="systems-title" className="space-y-4">
        <div>
          <h2 id="systems-title" className="text-2xl font-semibold">Meus sistemas</h2>
          <p className="mt-1 text-sm text-muted">
            As permissões são verificadas novamente ao abrir cada sistema.
          </p>
        </div>
        <WorkspaceTabs tabs={tabs} label="Filtrar sistemas por empresa" />
      </section>
      <footer className="border-t border-border pt-5 text-sm text-muted">
        O Access Management Service administra sua identidade e suas licenças.
        Você não precisa criar outra senha para entrar nos sistemas integrados.
      </footer>

      {searchOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/65 px-4 pt-[12vh]" onMouseDown={(event) => { if (event.target === event.currentTarget) closeOverlay(); }}>
          <section role="dialog" aria-modal="true" aria-label="Buscar sistema" className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
            <label htmlFor="portal-query" className="block text-sm font-semibold">Buscar sistema</label>
            <input
              id="portal-query"
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && matches[0]) {
                  setSearchOpen(false);
                  openDetail(matches[0]);
                }
              }}
              placeholder="Digite o nome do produto ou empresa"
              className="mt-2 w-full rounded-lg border border-border p-3 focus-visible:outline-2 focus-visible:outline-brand-600"
            />
            <ul className="mt-3 max-h-64 overflow-y-auto">
              {matches.map((item) => (
                <li key={getKey(item)}>
                  <button type="button" onClick={() => { setSearchOpen(false); openDetail(item); }}
                    className="flex w-full justify-between rounded-lg p-3 text-left hover:bg-brand-50">
                    <span>{item.product} · {item.company}</span>
                    <span className="text-xs text-muted">{stateOf(item)}</span>
                  </button>
                </li>
              ))}
              {!matches.length ? <li className="p-3 text-sm text-muted">Nenhum resultado.</li> : null}
            </ul>
            <button type="button" onClick={closeOverlay} className="mt-3 min-h-11 text-sm font-semibold text-brand-700">Fechar</button>
          </section>
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60" onMouseDown={(event) => { if (event.target === event.currentTarget) closeOverlay(); }}>
          <aside role="dialog" aria-modal="true" aria-label={'Detalhes do sistema ' + detail.product}
            className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-semibold">{detail.product}</h2>
              <button type="button" onClick={closeOverlay} className="min-h-11 rounded-lg border border-border px-4">Fechar</button>
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              <div><dt className="text-muted">Empresa</dt><dd className="font-semibold">{detail.company}</dd></div>
              <div><dt className="text-muted">Perfil</dt><dd className="font-semibold">{detail.role}</dd></div>
              <div><dt className="text-muted">Situação</dt><dd className="font-semibold">{stateOf(detail)}</dd></div>
            </dl>
            <p className="mt-6 text-sm leading-6 text-muted">
              {detail.status === 'REVOKED'
                ? 'O acesso a este produto foi revogado. Solicite nova autorização ao administrador da empresa.'
                : 'O sistema confirma as permissões antes de permitir a entrada.'}
            </p>
            <div className="mt-6">{launch(detail)}</div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}

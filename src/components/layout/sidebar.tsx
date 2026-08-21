import Link from 'next/link';

/**
 * Menu principal (docs/02-design/NAVIGATION.md).
 * Itens devem respeitar autorização do operador — hoje todos aparecem em
 * modo demonstração (SUPER_ADMIN); a filtragem por permissão real entra
 * quando o RBAC estiver ligado ao Supabase.
 */
const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/clientes', label: 'Clientes' },
  { href: '/usuarios', label: 'Usuários' },
  { href: '/produtos', label: 'Produtos' },
  { href: '/licenciamento', label: 'Licenciamento' },
  { href: '/convites', label: 'Convites' },
  { href: '/auditoria', label: 'Auditoria' },
  { href: '/administracao/operadores', label: 'Administração' },
];

export function Sidebar() {
  return (
    <aside className="border-border bg-background hidden w-56 shrink-0 border-r md:block">
      <div className="px-4 py-5">
        <span className="text-brand-700 text-base font-semibold">7Service</span>
      </div>
      <nav className="flex flex-col gap-0.5 px-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-foreground hover:bg-brand-50 hover:text-brand-700 rounded-md px-3 py-2 text-sm font-medium"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

/**
 * Aviso permanente enquanto não há projeto Supabase provisionado
 * (docs/MIGRATIONS.md - "Estado atual"). Some automaticamente assim que
 * as envs do Supabase forem configuradas.
 */
export function DemoModeBanner() {
  return (
    <div className="text-warning border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium">
      Modo demonstração — dados mockados, sem autenticação real e sem persistência garantida entre
      sessões. Auditoria, licenciamento e demais regras já seguem a especificação; a base Supabase
      será conectada assim que provisionada (docs/MIGRATIONS.md).
    </div>
  );
}

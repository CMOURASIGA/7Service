import { getMockStore } from '@/lib/mock/store';
import { listAuditLogs } from '@/services/audit';

export const metadata = {
  title: 'Auditoria - 7Service',
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const params = await searchParams;
  const logs = listAuditLogs({ action: params.action || undefined });
  const store = getMockStore();
  const actions = Array.from(new Set(store.auditLogs.map((l) => l.action))).sort();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-xl font-semibold">Auditoria</h1>
        <p className="text-muted text-sm">
          Trilha imutável de mudanças administrativas — não editável pela interface, inclusive por
          SUPER_ADMIN.
        </p>
      </div>

      <form className="flex gap-2" action="/auditoria">
        <select
          name="action"
          defaultValue={params.action ?? ''}
          className="border-border rounded-md border px-3 py-2 text-sm"
        >
          <option value="">Todas as ações</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="border-border rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Filtrar
        </button>
      </form>

      {logs.length === 0 ? (
        <div className="border-border text-muted rounded-lg border border-dashed p-10 text-center text-sm">
          Nenhum evento encontrado.
        </div>
      ) : (
        <div className="border-border bg-background overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="border-border text-muted border-b bg-slate-50 text-xs">
              <tr>
                <th className="px-4 py-2 font-medium">Quando</th>
                <th className="px-4 py-2 font-medium">Ação</th>
                <th className="px-4 py-2 font-medium">Alvo</th>
                <th className="px-4 py-2 font-medium">Operador</th>
                <th className="px-4 py-2 font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-border border-b last:border-0">
                  <td className="text-muted px-4 py-2">
                    {new Date(log.occurredAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="text-foreground px-4 py-2 font-medium">{log.action}</td>
                  <td className="text-muted px-4 py-2">
                    {log.targetType}
                    {log.targetId ? ` · ${log.targetId.slice(0, 8)}` : ''}
                  </td>
                  <td className="text-muted px-4 py-2">{log.actorLabel}</td>
                  <td className="text-muted px-4 py-2">{log.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

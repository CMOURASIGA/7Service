import { requirePermission } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';


export const metadata = {
  title: 'Auditoria - 7Service',
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const params = await searchParams;
  await requirePermission('audit.view');
  const db = await createClient();
  let query = db.from('audit_logs')
    .select('id,occurred_at,action,target_type,target_id,reason,actor_internal_user_id,internal_users(first_name,last_name)')
    .order('occurred_at', { ascending: false }).limit(250);
  if (params.action?.trim()) query = query.eq('action', params.action.trim());
  const { data: logs, error } = await query;
  if (error) throw new Error('Falha ao consultar auditoria');
  const actions = Array.from(new Set((logs ?? []).map(l => l.action))).sort();

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

      {!logs?.length ? (
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
              {(logs ?? []).map((log) => (
                <tr key={log.id} className="border-border border-b last:border-0">
                  <td className="text-muted px-4 py-2">
                    {new Date(log.occurred_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="text-foreground px-4 py-2 font-medium">{log.action}</td>
                  <td className="text-muted px-4 py-2">
                    {log.target_type}
                    {log.target_id ? ` · ${log.target_id.slice(0, 8)}` : ''}
                  </td>
                  <td className="text-muted px-4 py-2">{[log.internal_users?.first_name, log.internal_users?.last_name].filter(Boolean).join(' ') || 'Sistema'}</td>
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

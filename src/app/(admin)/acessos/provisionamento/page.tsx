import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type OperationRow = {
  request_id: string;
  environment_id: string;
  identity_id: string;
  operation: string;
  status: string;
  attempts: number;
  last_error_code: string | null;
  created_at: string;
};

export default async function ProvisioningOperationsPage() {
  await requirePermission('users.access.manage');
  const db = createAdminClient() as unknown as SupabaseClient;
  const { data, error } = await db
    .from('provisioning_operations')
    .select(
      'request_id,environment_id,identity_id,operation,status,attempts,last_error_code,created_at',
    )
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <main className="flex flex-col gap-5">
      <div>
        <Link href="/acessos" className="text-brand-700 text-sm underline">
          Acessos
        </Link>
        <h1 className="text-xl font-semibold">Operações de provisionamento</h1>
        <p className="text-muted text-sm">
          Painel de acompanhamento. Somente a confirmação do perfil no destino permite considerar o
          acesso provisionado. Não executa operações automaticamente.
        </p>
      </div>
      {error ? (
        <p role="alert" className="rounded-lg border p-4 text-sm">
          Estrutura de provisionamento não disponível neste ambiente. A migração ainda precisa ser
          validada e aplicada.
        </p>
      ) : !data?.length ? (
        <p className="rounded-lg border p-4 text-sm">Nenhuma operação registrada.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="p-3">Solicitação</th>
                <th className="p-3">Operação</th>
                <th className="p-3">Situação</th>
                <th className="p-3">Tentativas</th>
                <th className="p-3">Falha</th>
              </tr>
            </thead>
            <tbody>
              {(data as OperationRow[]).map((row) => (
                <tr key={row.request_id} className="border-b">
                  <td className="p-3">
                    <span className="font-mono text-xs">{row.request_id.slice(0, 8)}</span>
                    <p className="text-xs text-slate-600">{row.created_at}</p>
                  </td>
                  <td className="p-3">{row.operation}</td>
                  <td className="p-3">{row.status}</td>
                  <td className="p-3">{row.attempts}</td>
                  <td className="p-3">{row.last_error_code ?? 'Nenhuma'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { ConnectionForm } from './form';

export const dynamic = 'force-dynamic';

export default async function EnvironmentConnectionsPage() {
  await requirePermission('clients.manage');
  const db = createAdminClient();
  const { data: envs, error: envError } = await db
    .from('product_environments')
    .select('id,environment,status,deployment_id')
    .neq('status', 'RETIRED')
    .neq('status', 'SUSPENDED');
  const extensionDb = db as unknown as SupabaseClient;
  const { data: connections, error: connectionsError } = await extensionDb
    .from('environment_connections')
    .select('environment_id,project_url,status,verified_at');
  return (
    <main className="flex flex-col gap-6">
      <div>
        <Link href="/ambientes" className="text-sm text-brand-700 underline">Ambientes</Link>
        <h1 className="text-xl font-semibold">Conexões Supabase</h1>
        <p className="text-muted text-sm">
          Cada conexão pertence a um ambiente e à sua implantação. As credenciais
          não são exibidas depois do registro.
        </p>
      </div>
      {envError || connectionsError ? (
        <p role="alert" className="rounded-md border p-4 text-sm">
          A estrutura de conexões ainda não está disponível neste banco.
          Aplique e valide as migrações aditivas antes de habilitar esta operação.
        </p>
      ) : (
        <>
          <ConnectionForm environments={(envs ?? []).map(e => ({
            id: e.id,
            label: `${e.environment} / implantação ${e.deployment_id.slice(0, 8)}`,
          }))} />
          <section className="rounded-lg border p-4">
            <h2 className="mb-3 font-semibold">Conexões registradas</h2>
            {!connections?.length ? (
              <p className="text-muted text-sm">Nenhuma conexão verificada.</p>
            ) : (
              <ul className="space-y-2">
                {connections.map(c => (
                  <li key={c.environment_id} className="rounded-md border p-3 text-sm">
                    <p>{c.project_url} / {c.status}</p>
                    <p className="text-muted text-xs">Ambiente: {c.environment_id}</p>
                    <p className="text-muted text-xs">Última verificação: {c.verified_at ?? 'Não verificado'}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

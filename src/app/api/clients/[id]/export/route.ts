import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { internalUser } = await requirePermission('clients.manage');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return NextResponse.json({ error: 'Identificador invalido' }, { status: 400 });
  const db = await createClient();
  const [client, addresses, contracts, subscriptions, memberships, deployments] = await Promise.all(
    [
      db.from('clients').select('*').eq('id', id).maybeSingle(),
      db.from('client_addresses').select('*').eq('client_id', id),
      db.from('contracts').select('*').eq('client_id', id),
      db.from('subscriptions').select('*').eq('client_id', id),
      db.from('client_memberships').select('id,identity_id,status').eq('client_id', id),
      db.from('client_deployments').select('id,deployment_id').eq('client_id', id),
    ],
  );
  if (
    client.error ||
    addresses.error ||
    contracts.error ||
    subscriptions.error ||
    memberships.error ||
    deployments.error
  ) {
    return NextResponse.json({ error: 'Falha na leitura do pacote de dados' }, { status: 500 });
  }
  if (!client.data) return NextResponse.json({ error: 'Cliente nao encontrado' }, { status: 404 });
  const { error: auditError } = await createAdminClient().from('audit_logs').insert({
    actor_internal_user_id: internalUser.id,
    action: 'client.export_requested',
    target_type: 'client',
    target_id: id,
    client_id: id,
    source: '7service',
  });
  if (auditError)
    return NextResponse.json({ error: 'Falha ao registrar auditoria' }, { status: 500 });
  const body = {
    generatedAt: new Date().toISOString(),
    client: client.data,
    addresses: addresses.data,
    contracts: contracts.data,
    subscriptions: subscriptions.data,
    memberships: memberships.data,
    deployments: deployments.data,
    note: 'Pacote administrativo central. Dados operacionais armazenados no banco dedicado nao estao incluidos.',
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="cliente-' + id + '-admin-export.json"',
      'Cache-Control': 'no-store',
    },
  });
}

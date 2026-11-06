import Link from 'next/link';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { StatusBadge } from '@/components/ui/status-badge';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { INVITATION_STATUS_LABEL } from '@/lib/status-labels';

import { cancelInvitationAction } from './actions';

export const metadata = {
  title: 'Convites - 7Service',
};

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ historico?: string }>;
}) {
  const showHistory = (await searchParams).historico === '1';
  await requirePermission('invitations.manage');
  const db = createAdminClient();
  const { data: invitations, error } = await db
    .from('invitations')
    .select('id,status,expires_at,identity_id,identities(first_name,last_name)')
    .order('created_at', { ascending: false });
  if (error) throw new Error('Falha ao consultar convites');

  const { data: clients, error: clientsError } = await db
    .from('clients')
    .select('id')
    .eq('status', 'ACTIVE');
  if (clientsError) throw new Error('Falha ao consultar clientes ativos');
  const clientIds = (clients ?? []).map((c) => c.id);
  const { data: memberships, error: membershipsError } = clientIds.length
    ? await db.from('client_memberships').select('identity_id').in('client_id', clientIds)
    : { data: [], error: null };
  if (membershipsError) throw new Error('Falha ao consultar usuários vinculados');
  const visibleIdentities = new Set((memberships ?? []).map((m) => m.identity_id));
  const visibleInvitations = (invitations ?? []).filter(
    (inv) => showHistory || visibleIdentities.has(inv.identity_id),
  );
  const now = new Date().getTime();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-xl font-semibold">Convites</h1>
        <p className="text-muted text-sm">
          O prazo exibido é do acompanhamento administrativo. A validade e a revogação do link de
          autenticação são controladas pelo Supabase Auth.
        </p>
      </div>

      <Link
        className="text-brand-700 text-sm underline"
        href={showHistory ? '/convites' : '/convites?historico=1'}
      >
        {showHistory ? 'Ocultar convites históricos' : 'Consultar convites históricos'}
      </Link>
      <div className="border-border bg-background overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-border text-muted border-b bg-slate-50 text-xs">
            <tr>
              <th className="px-4 py-2 font-medium">Usuário</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Expira em</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {visibleInvitations.map((inv) => {
              const identity = inv.identities;
              const effectiveStatus =
                ['PENDING', 'SENT'].includes(inv.status) &&
                new Date(inv.expires_at).getTime() <= now
                  ? 'EXPIRED'
                  : inv.status;
              const statusInfo =
                INVITATION_STATUS_LABEL[effectiveStatus as keyof typeof INVITATION_STATUS_LABEL];
              const cancel = cancelInvitationAction.bind(null, inv.id);
              const isActionable =
                (inv.status === 'SENT' || inv.status === 'PENDING') &&
                effectiveStatus !== 'EXPIRED';

              return (
                <tr key={inv.id} className="border-border border-b last:border-0 hover:bg-slate-50">
                  <td className="text-foreground px-4 py-2 font-medium">
                    {identity ? `${identity.first_name} ${identity.last_name}` : inv.identity_id}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
                  </td>
                  <td className="text-muted px-4 py-2">
                    {new Date(inv.expires_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2">
                    {isActionable ? (
                      <div className="flex gap-2">
                        <ConfirmAction
                          triggerLabel="Cancelar"
                          impactMessage="Cancela apenas o acompanhamento administrativo do convite. Esta ação NÃO revoga automaticamente o link enviado pelo Supabase Auth."
                          action={cancel}
                          tone="danger"
                          confirmLabel="Cancelar convite"
                        />
                      </div>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

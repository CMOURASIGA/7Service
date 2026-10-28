import { ConfirmAction } from '@/components/ui/confirm-action';
import { StatusBadge } from '@/components/ui/status-badge';
import { requirePermission } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { INVITATION_STATUS_LABEL } from '@/lib/status-labels';

import { cancelInvitationAction } from './actions';

export const metadata = {
  title: 'Convites - 7Service',
};

export default async function InvitationsPage() {
  await requirePermission('invitations.manage');
  const db = await createClient();
  const { data: invitations, error } = await db.from('invitations').select('id,status,expires_at,identity_id,identities(first_name,last_name)').order('created_at',{ascending:false});
  if (error) throw new Error('Falha ao consultar convites');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-foreground text-xl font-semibold">Convites</h1>
        <p className="text-muted text-sm">
          Validade de 24 horas. Reenviar gera um novo token e invalida o anterior.
        </p>
      </div>

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
            {(invitations ?? []).map((inv) => {
              const identity = inv.identities;
              const statusInfo = INVITATION_STATUS_LABEL[inv.status as keyof typeof INVITATION_STATUS_LABEL];
              const cancel = cancelInvitationAction.bind(null, inv.id);
              const isActionable = inv.status === 'SENT' || inv.status === 'PENDING';

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
                          impactMessage="O convite será cancelado e o link atual deixará de funcionar."
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

import { ConfirmAction } from '@/components/ui/confirm-action';
import { StatusBadge } from '@/components/ui/status-badge';
import { getMockStore } from '@/lib/mock/store';
import { INVITATION_STATUS_LABEL } from '@/lib/status-labels';
import { listInvitations } from '@/services/invitations';

import { cancelInvitationAction, resendInvitationAction } from './actions';

export const metadata = {
  title: 'Convites - 7Service',
};

export default function InvitationsPage() {
  const invitations = listInvitations();
  const store = getMockStore();

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
            {invitations.map((inv) => {
              const identity = store.identities.find((i) => i.id === inv.identityId);
              const statusInfo = INVITATION_STATUS_LABEL[inv.status];
              const resend = resendInvitationAction.bind(null, inv.id);
              const cancel = cancelInvitationAction.bind(null, inv.id);
              const isActionable = inv.status === 'SENT' || inv.status === 'PENDING';

              return (
                <tr key={inv.id} className="border-border border-b last:border-0 hover:bg-slate-50">
                  <td className="text-foreground px-4 py-2 font-medium">
                    {identity ? `${identity.firstName} ${identity.lastName}` : inv.identityId}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge label={statusInfo.label} tone={statusInfo.tone} />
                  </td>
                  <td className="text-muted px-4 py-2">
                    {new Date(inv.expiresAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2">
                    {isActionable ? (
                      <div className="flex gap-2">
                        <ConfirmAction
                          triggerLabel="Reenviar"
                          impactMessage="Um novo link será gerado e o anterior deixará de funcionar."
                          action={resend}
                          confirmLabel="Reenviar"
                        />
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

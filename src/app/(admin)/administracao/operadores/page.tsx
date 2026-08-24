import { ConfirmAction } from '@/components/ui/confirm-action';
import { StatusBadge } from '@/components/ui/status-badge';
import { NewInternalUserForm } from '@/features/internal-users/components/new-internal-user-form';
import { RoleEditor } from '@/features/internal-users/components/role-editor';
import { listInternalRoles, listInternalUsers } from '@/services/internal-users';

import {
  blockInternalUserAction,
  reactivateInternalUserAction,
  updateInternalUserRolesAction,
} from './actions';

export const metadata = {
  title: 'Administração de operadores - 7Service',
};

export default function InternalOperatorsPage() {
  const users = listInternalUsers();
  const roles = listInternalRoles();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-xl font-semibold">Administração interna</h1>
        <p className="text-muted text-sm">
          Cadastre operadores da Consult Services e atribua perfis (RBAC) sem acesso direto ao
          banco.
        </p>
      </div>

      <div className="border-border bg-background rounded-lg border p-6">
        <h2 className="text-foreground mb-4 text-sm font-semibold">Novo operador</h2>
        <NewInternalUserForm roles={roles} />
      </div>

      <div className="border-border bg-background overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-border text-muted border-b bg-slate-50 text-xs">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">E-mail</th>
              <th className="px-4 py-2 font-medium">Perfis</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Criado em</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const updateRoles = updateInternalUserRolesAction.bind(null, user.id);
              const block = blockInternalUserAction.bind(null, user.id);
              const reactivate = reactivateInternalUserAction.bind(null, user.id);

              return (
                <tr key={user.id} className="border-border border-b align-top last:border-0">
                  <td className="text-foreground px-4 py-2 font-medium">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="text-muted px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted">{user.roleCodes.join(', ') || '—'}</span>
                      <RoleEditor user={user} roles={roles} action={updateRoles} />
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge
                      label={user.status === 'ACTIVE' ? 'Ativo' : 'Bloqueado'}
                      tone={user.status === 'ACTIVE' ? 'success' : 'danger'}
                    />
                  </td>
                  <td className="text-muted px-4 py-2">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-2">
                    {user.status === 'ACTIVE' ? (
                      <ConfirmAction
                        triggerLabel="Bloquear"
                        impactMessage={`${user.firstName} perderá acesso administrativo ao 7Service imediatamente.`}
                        action={block}
                        tone="danger"
                        confirmLabel="Bloquear"
                      />
                    ) : (
                      <ConfirmAction
                        triggerLabel="Reativar"
                        impactMessage={`${user.firstName} voltará a ter acesso administrativo.`}
                        action={reactivate}
                        confirmLabel="Reativar"
                      />
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

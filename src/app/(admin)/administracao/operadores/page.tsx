import { ConfirmAction } from '@/components/ui/confirm-action';
import { StatusBadge } from '@/components/ui/status-badge';
import { RoleEditor } from '@/features/internal-users/components/role-editor';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import type { InternalRole,InternalUser,InternalRoleCode } from '@/types/domain';

import {
  blockInternalUserAction,
  reactivateInternalUserAction,
  updateInternalUserRolesAction,
} from './actions';

export const metadata = {
  title: 'Administração de operadores - 7Service',
};

export default async function InternalOperatorsPage() {
  await requirePermission('internal_users.manage');
  const db = createAdminClient();
  const [userQuery,roleQuery] = await Promise.all([
    db.from('internal_users').select('id,auth_user_id,first_name,last_name,email,status,created_at,updated_at,internal_user_roles(internal_roles(code))').order('first_name'),
    db.from('internal_roles').select('id,code,name,description').order('name'),
  ]);
  if(userQuery.error || roleQuery.error) throw new Error('Falha ao carregar operadores');
  const roles: InternalRole[] = (roleQuery.data??[]).map(x=>({
    id:x.id,code:x.code as InternalRoleCode,name:x.name,description:x.description
  }));
  const users: InternalUser[] = (userQuery.data??[]).map(x=>({
    id:x.id,authUserId:x.auth_user_id,firstName:x.first_name,lastName:x.last_name,
    email:x.email,status:x.status as InternalUser['status'],
    createdAt:x.created_at,updatedAt:x.updated_at,
    roleCodes:x.internal_user_roles.map(y=>y.internal_roles?.code as InternalRoleCode).filter(Boolean)
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-xl font-semibold">Administração interna</h1>
        <p className="text-muted text-sm">
          Cadastre operadores da Consult Services e atribua perfis (RBAC) sem acesso direto ao
          banco.
        </p>
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
        O cadastramento de novos operadores exige primeiro provisionar uma identidade no Supabase Auth.
        Nenhum operador é criado sem vinculo autenticado.
      </p>

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

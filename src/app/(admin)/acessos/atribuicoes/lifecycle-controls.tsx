'use client';

import { useActionState } from 'react';
import { reactivateContractRole, revokeContractRole } from './lifecycle-actions';

export function RoleLifecycleControls({
  assignmentId, status,
}: { assignmentId: string; status: string }) {
  const [revocation, revoke, revoking] = useActionState(revokeContractRole, { error: null });
  const [reactivation, reactivate, reactivating] = useActionState(
    reactivateContractRole, { error: null },
  );
  if (status === 'ACTIVE' || status === 'PENDING') {
    return (
      <form action={revoke} className="flex min-w-52 flex-col gap-2">
        <input type="hidden" name="assignmentId" value={assignmentId}/>
        <select name="targetStatus" className="rounded border p-1 text-xs" defaultValue="SUSPENDED">
          <option value="SUSPENDED">Suspender acesso</option>
          <option value="REVOKED">Revogar acesso</option>
        </select>
        <input name="reason" type="text" required minLength={5} maxLength={500}
          className="rounded border p-1 text-xs" placeholder="Justificativa obrigatória"/>
        <button type="submit" disabled={revoking}
          className="rounded border border-red-700 p-1 text-xs text-red-700 disabled:opacity-50">
          {revoking ? 'Processando...' : 'Solicitar bloqueio no produto'}
        </button>
        {revocation.error ? <p role="alert" className="text-xs text-red-700">{revocation.error}</p> : null}
        {revocation.success ? <p role="status" className="text-xs">{revocation.success}</p> : null}
      </form>
    );
  }
  if (status === 'SUSPENDED') {
    return (
      <form action={reactivate} className="flex min-w-52 flex-col gap-2">
        <input type="hidden" name="assignmentId" value={assignmentId}/>
        <button type="submit" disabled={reactivating}
          className="rounded border border-blue-700 p-1 text-xs text-blue-700 disabled:opacity-50">
          {reactivating ? 'Verificando...' : 'Solicitar reativação'}
        </button>
        {reactivation.error ? <p role="alert" className="text-xs text-red-700">{reactivation.error}</p> : null}
        {reactivation.success ? <p role="status" className="text-xs">{reactivation.success}</p> : null}
      </form>
    );
  }
  return <span className="text-xs text-slate-500">Sem ações disponíveis</span>;
}

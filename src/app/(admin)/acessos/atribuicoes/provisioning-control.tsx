'use client';

import { useActionState } from 'react';
import { provisionPendingContractRole } from './provisioning-actions';

export function PendingRoleProvisioningControl({ assignmentId }: { assignmentId: string }) {
  const [status, action, isPending] = useActionState(provisionPendingContractRole, { error: null });
  return (
    <form action={action} className="flex flex-col gap-2">
      <input name="assignmentId" type="hidden" value={assignmentId} />
      <button
        className="rounded-md border border-blue-700 px-3 py-1 text-xs text-blue-700 disabled:opacity-50"
        disabled={isPending}
      >
        {isPending ? 'Confirmando...' : 'Provisionar e confirmar perfil'}
      </button>
      {status.error ? (
        <p role="alert" className="max-w-xs text-xs text-red-700">
          {status.error}
        </p>
      ) : null}
      {status.success ? (
        <p role="status" className="max-w-xs text-xs">
          {status.success}
        </p>
      ) : null}
    </form>
  );
}

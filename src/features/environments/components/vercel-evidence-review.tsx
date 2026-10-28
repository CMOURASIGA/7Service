'use client';

import { useActionState } from 'react';
import { verifyVercelEvidence } from '@/app/(admin)/ambientes/verify-vercel-actions';

export function VercelEvidenceReview({ evidenceId }: { evidenceId: string }) {
  const [state, action, pending] = useActionState(verifyVercelEvidence, { error: null });
  return (
    <form action={action} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="evidenceId" value={evidenceId} />
      <button
        disabled={pending}
        className="self-start rounded border px-2 py-1 text-xs disabled:opacity-50"
      >
        {pending ? 'Consultando Vercel...' : 'Verificar deployment Vercel'}
      </button>
      {state.error ? (
        <p role="alert" className="text-xs text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-xs">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}

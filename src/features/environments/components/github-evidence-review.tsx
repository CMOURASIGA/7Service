'use client';

import { ActionButton } from '@/components/ui/action-button';
import { useActionState } from 'react';
import { verifyGithubEvidence } from '@/app/(admin)/ambientes/verify-github-actions';

export function GithubEvidenceReview({ evidenceId }: { evidenceId: string }) {
  const [state, action, pending] = useActionState(verifyGithubEvidence, { error: null });
  return (
    <form action={action} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="evidenceId" value={evidenceId} />
      <ActionButton
        disabled={pending}
        variant="secondary" size="sm"
      >
        {pending ? 'Consultando GitHub...' : 'Verificar execução e deployment'}
      </ActionButton>
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

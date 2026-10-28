'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export type EvidenceState = { error: string | null; success?: string };
const schema = z.object({
  environmentId: z.string().uuid(),
  commitSha: z.string().trim().regex(/^[a-fA-F0-9]{40}$/),
  provider: z.enum(['GITHUB_ACTIONS', 'VERCEL', 'MANUAL_REVIEW']),
  runReference: z.string().trim().min(8).max(512),
  notes: z.string().trim().max(1000),
});
export async function recordEvidence(_previous: EvidenceState, form: FormData): Promise<EvidenceState> {
  const { internalUser } = await requirePermission('clients.manage');
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Informe ambiente, SHA, provedor e referência válidos.' };
  const p = parsed.data;
  const { error } = await createAdminClient().rpc('record_deployment_evidence', {
    p_actor: internalUser.id, p_environment: p.environmentId,
    p_sha: p.commitSha, p_provider: p.provider, p_reference: p.runReference,
    p_notes: p.notes,
  });
  if (error) return { error: error.message };
  revalidatePath('/ambientes');
  return { error: null, success: 'Referência registrada como NÃO VERIFICADA. Não altera o status do ambiente.' };
}

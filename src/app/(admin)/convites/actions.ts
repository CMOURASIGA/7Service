'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function cancelInvitationAction(invitationId: string, _formData: FormData) {
  const { internalUser } = await requirePermission('invitations.manage');
  const db = createAdminClient();
  const { data: old, error: readError } = await db
    .from('invitations')
    .select('id,status,identity_id')
    .eq('id', invitationId)
    .single();
  if (readError || !old) throw new Error('Convite nao encontrado');
  if (!['PENDING', 'SENT'].includes(old.status)) throw new Error('Convite nao pode ser cancelado');
  const { data: updated, error } = await db
    .from('invitations')
    .update({ status: 'CANCELLED', cancelled_at: new Date().toISOString() })
    .eq('id', invitationId)
    .in('status', ['PENDING', 'SENT'])
    .select('id')
    .single();
  if (error || !updated) throw new Error('Nao foi possivel cancelar convite');
  const { error: auditError } = await createAdminClient()
    .from('audit_logs')
    .insert({
      actor_internal_user_id: internalUser.id,
      action: 'invitation.cancelled',
      target_type: 'invitation',
      target_id: invitationId,
      source: '7service',
      before_json: { status: old.status },
      after_json: { status: 'CANCELLED' },
    });
  if (auditError) throw new Error('Convite cancelado, mas auditoria nao persistiu');
  revalidatePath('/convites');
}

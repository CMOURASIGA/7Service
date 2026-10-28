'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function cancelInvitationAction(invitationId: string, _formData: FormData) {
  const { internalUser } = await requirePermission('invitations.manage');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(invitationId)) {
    throw new Error('Identificador de convite inválido');
  }

  // Cancellation and audit must succeed or roll back together.
  const { error } = await createAdminClient().rpc('cancel_invitation_atomic', {
    p_actor: internalUser.id,
    p_invitation: invitationId,
  });
  if (error) throw new Error('Não foi possível cancelar o convite e registrar a auditoria.');
  revalidatePath('/convites');
}

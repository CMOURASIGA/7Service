'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentSession } from '@/lib/auth/session';
import { cancelInvitation, resendInvitation } from '@/services/invitations';

export async function resendInvitationAction(invitationId: string, _formData: FormData) {
  const session = await getCurrentSession();
  resendInvitation(invitationId, session.internalUser);
  revalidatePath('/convites');
}

export async function cancelInvitationAction(invitationId: string, _formData: FormData) {
  const session = await getCurrentSession();
  cancelInvitation(invitationId, session.internalUser);
  revalidatePath('/convites');
}

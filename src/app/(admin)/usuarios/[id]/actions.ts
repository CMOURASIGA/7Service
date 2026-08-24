'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentSession } from '@/lib/auth/session';
import { setAccessStatus } from '@/services/access';

export async function suspendAccessAction(
  accessId: string,
  identityId: string,
  formData: FormData,
) {
  const session = await getCurrentSession();
  const reason = formData.get('reason')?.toString().trim();
  setAccessStatus(accessId, 'SUSPENDED', session.internalUser, reason || undefined);
  revalidatePath(`/usuarios/${identityId}`);
}

export async function reactivateAccessAction(
  accessId: string,
  identityId: string,
  _formData: FormData,
) {
  const session = await getCurrentSession();
  setAccessStatus(accessId, 'ACTIVE', session.internalUser);
  revalidatePath(`/usuarios/${identityId}`);
}

export async function revokeAccessAction(accessId: string, identityId: string, formData: FormData) {
  const session = await getCurrentSession();
  const reason = formData.get('reason')?.toString().trim();
  setAccessStatus(accessId, 'REVOKED', session.internalUser, reason || undefined);
  revalidatePath(`/usuarios/${identityId}`);
}

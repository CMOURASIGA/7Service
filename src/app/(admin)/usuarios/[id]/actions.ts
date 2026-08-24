'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentSession } from '@/lib/auth/session';
import { grantAccess, setAccessStatus } from '@/services/access';
import { initiateRecovery } from '@/services/recovery';

export interface GrantAccessFormState {
  error: string | null;
}

export async function grantAccessAction(
  identityId: string,
  _prevState: GrantAccessFormState,
  formData: FormData,
): Promise<GrantAccessFormState> {
  const session = await getCurrentSession();

  try {
    grantAccess(
      {
        identityId,
        subscriptionId: String(formData.get('subscriptionId') ?? ''),
        productRoleId: String(formData.get('productRoleId') ?? ''),
      },
      session.internalUser,
    );
    revalidatePath(`/usuarios/${identityId}`);
    return { error: null };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}

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

export async function initiateRecoveryAction(identityId: string, _formData: FormData) {
  const session = await getCurrentSession();
  initiateRecovery(identityId, session.internalUser);
  revalidatePath(`/usuarios/${identityId}`);
}

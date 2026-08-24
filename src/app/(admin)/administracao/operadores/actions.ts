'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentSession } from '@/lib/auth/session';
import {
  createInternalUser,
  setInternalUserStatus,
  updateInternalUserRoles,
} from '@/services/internal-users';
import type { InternalRoleCode } from '@/types/domain';

export interface InternalUserFormState {
  error: string | null;
}

export async function createInternalUserAction(
  _prevState: InternalUserFormState,
  formData: FormData,
): Promise<InternalUserFormState> {
  const session = await getCurrentSession();

  const roleCodes = formData.getAll('roleCodes') as InternalRoleCode[];
  if (roleCodes.length === 0) {
    return { error: 'Selecione ao menos um perfil' };
  }

  try {
    createInternalUser(
      {
        firstName: String(formData.get('firstName') ?? ''),
        lastName: String(formData.get('lastName') ?? ''),
        email: String(formData.get('email') ?? ''),
        roleCodes,
      },
      session.internalUser,
    );
    revalidatePath('/administracao/operadores');
    return { error: null };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}

export async function updateInternalUserRolesAction(userId: string, formData: FormData) {
  const session = await getCurrentSession();
  const roleCodes = formData.getAll('roleCodes') as InternalRoleCode[];
  updateInternalUserRoles(userId, roleCodes, session.internalUser);
  revalidatePath('/administracao/operadores');
}

export async function blockInternalUserAction(userId: string, _formData: FormData) {
  const session = await getCurrentSession();
  setInternalUserStatus(userId, 'BLOCKED', session.internalUser);
  revalidatePath('/administracao/operadores');
}

export async function reactivateInternalUserAction(userId: string, _formData: FormData) {
  const session = await getCurrentSession();
  setInternalUserStatus(userId, 'ACTIVE', session.internalUser);
  revalidatePath('/administracao/operadores');
}

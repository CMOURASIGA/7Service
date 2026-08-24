'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getCurrentSession } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { createClient, setClientStatus, updateClient } from '@/services/clients';
import type { ClientAddress, PersonType } from '@/types/domain';

export interface ClientFormState {
  error: string | null;
}

function readAddress(formData: FormData): ClientAddress | null {
  const postalCode = formData.get('postalCode')?.toString().trim();
  const street = formData.get('street')?.toString().trim();

  if (!postalCode && !street) return null;

  return {
    postalCode: postalCode || null,
    street: street || null,
    number: formData.get('number')?.toString().trim() || null,
    complement: formData.get('complement')?.toString().trim() || null,
    district: formData.get('district')?.toString().trim() || null,
    city: formData.get('city')?.toString().trim() || null,
    state: formData.get('state')?.toString().trim() || null,
    country: formData.get('country')?.toString().trim() || 'BR',
  };
}

export async function createClientAction(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const session = await getCurrentSession();

  try {
    const client = createClient(
      {
        personType: formData.get('personType') as PersonType,
        document: String(formData.get('document') ?? ''),
        legalName: String(formData.get('legalName') ?? ''),
        tradeName: formData.get('tradeName')?.toString() || null,
        phone: formData.get('phone')?.toString() || null,
        email: formData.get('email')?.toString() || null,
        contactName: formData.get('contactName')?.toString() || null,
        notes: formData.get('notes')?.toString() || null,
        address: readAddress(formData),
      },
      session.internalUser,
    );

    revalidatePath('/clientes');
    redirect(`/clientes/${client.id}`);
  } catch (error) {
    if (isAppError(error)) {
      return { error: error.message };
    }
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function updateClientAction(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const session = await getCurrentSession();

  try {
    updateClient(
      clientId,
      {
        legalName: String(formData.get('legalName') ?? ''),
        tradeName: formData.get('tradeName')?.toString() || null,
        phone: formData.get('phone')?.toString() || null,
        email: formData.get('email')?.toString() || null,
        contactName: formData.get('contactName')?.toString() || null,
        notes: formData.get('notes')?.toString() || null,
        address: readAddress(formData),
      },
      session.internalUser,
    );

    revalidatePath(`/clientes/${clientId}`);
    revalidatePath('/clientes');
    return { error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function suspendClientAction(clientId: string, formData: FormData) {
  const session = await getCurrentSession();
  const reason = formData.get('reason')?.toString().trim();
  setClientStatus(clientId, 'SUSPENDED', session.internalUser, reason || undefined);
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath('/clientes');
}

export async function reactivateClientAction(clientId: string, _formData: FormData) {
  const session = await getCurrentSession();
  setClientStatus(clientId, 'ACTIVE', session.internalUser);
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath('/clientes');
}

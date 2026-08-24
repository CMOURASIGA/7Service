'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getCurrentSession } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { addContractDocument, createContract } from '@/services/contracts';
import { createClient, setClientStatus, updateClient } from '@/services/clients';
import { recordExportDelivery } from '@/services/export';
import { createSubscription } from '@/services/subscriptions';
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

export async function closeClientAction(clientId: string, formData: FormData) {
  const session = await getCurrentSession();
  const reason = formData.get('reason')?.toString().trim();
  setClientStatus(clientId, 'CLOSED', session.internalUser, reason || undefined);
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath('/clientes');
}

export interface ContractFormState {
  error: string | null;
}

export async function createContractAction(
  clientId: string,
  _prevState: ContractFormState,
  formData: FormData,
): Promise<ContractFormState> {
  const session = await getCurrentSession();

  try {
    createContract(
      {
        clientId,
        reference: String(formData.get('reference') ?? ''),
        startDate: String(formData.get('startDate') ?? ''),
        endDate: formData.get('endDate')?.toString() || null,
        notes: formData.get('notes')?.toString() || null,
      },
      session.internalUser,
    );
    revalidatePath(`/clientes/${clientId}`);
    return { error: null };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}

export async function uploadContractDocumentAction(
  clientId: string,
  contractId: string,
  formData: FormData,
) {
  const session = await getCurrentSession();
  const file = formData.get('file');

  if (file instanceof File && file.size > 0) {
    addContractDocument(
      {
        contractId,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        signedDocument: true,
      },
      session.internalUser,
    );
  }

  revalidatePath(`/clientes/${clientId}`);
}

export interface SubscriptionFormState {
  error: string | null;
}

export async function createSubscriptionAction(
  clientId: string,
  _prevState: SubscriptionFormState,
  formData: FormData,
): Promise<SubscriptionFormState> {
  const session = await getCurrentSession();

  try {
    createSubscription(
      {
        clientId,
        contractId: String(formData.get('contractId') ?? ''),
        productId: String(formData.get('productId') ?? ''),
        startDate: String(formData.get('startDate') ?? ''),
        endDate: formData.get('endDate')?.toString() || null,
        graceDays: Number(formData.get('graceDays') ?? 5),
        licenseLimit: Number(formData.get('licenseLimit') ?? 0),
        monthlyValue: formData.get('monthlyValue') ? Number(formData.get('monthlyValue')) : null,
        implementationValue: formData.get('implementationValue')
          ? Number(formData.get('implementationValue'))
          : null,
      },
      session.internalUser,
    );
    revalidatePath(`/clientes/${clientId}`);
    return { error: null };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}

/**
 * Registra formalmente que o pacote de exportação foi entregue ao cliente
 * (docs/03-domains/CLIENTS.md - "Portabilidade de dados": "a entrega deve
 * gerar um registro formal"). O download em si (`/api/clients/[id]/export`)
 * já audita `client.export_requested`; esta ação complementa com
 * `client.export_delivered`, deixando explícito no histórico que a
 * entrega foi confirmada pelo operador, não apenas gerada.
 */
export async function recordExportDeliveryAction(clientId: string, formData: FormData) {
  const session = await getCurrentSession();
  const note = formData.get('reason')?.toString().trim();
  recordExportDelivery(clientId, session.internalUser, note || undefined);
  revalidatePath(`/clientes/${clientId}`);
}

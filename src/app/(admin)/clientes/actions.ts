'use server';

import { revalidatePath } from 'next/cache';

import { requirePermission } from '@/lib/auth/session';
import { createClient as createDbClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAppError } from '@/lib/errors';
import type { ClientAddress, PersonType } from '@/types/domain';

export interface ClientFormState {
  error: string | null;
  createdId?: string;
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
  const session = await requirePermission('clients.manage');

  try {
    const db = await createDbClient();
    const personType = String(formData.get('personType') ?? '');
    const document = String(formData.get('document') ?? '').replace(/\D/g, '');
    const legalName = String(formData.get('legalName') ?? '').trim();
    if (
      !['PF', 'PJ'].includes(personType) ||
      document.length !== (personType === 'PF' ? 11 : 14) ||
      !legalName
    ) {
      return { error: 'Informe tipo, documento e nome validos.' };
    }
    const { data: existing, error: existingError } = await db
      .from('clients')
      .select('id')
      .eq('document', document)
      .neq('status', 'CLOSED')
      .limit(1);
    if (existingError) throw existingError;
    if (existing?.length) return { error: 'Ja existe um cliente ativo com este documento.' };
    const { data: client, error: createError } = await db
      .from('clients')
      .insert({
        person_type: personType as PersonType,
        document,
        legal_name: legalName,
        trade_name: formData.get('tradeName')?.toString().trim() || null,
        phone: formData.get('phone')?.toString().trim() || null,
        email: formData.get('email')?.toString().trim() || null,
        contact_name: formData.get('contactName')?.toString().trim() || null,
        notes: formData.get('notes')?.toString().trim() || null,
        relationship_start_date: new Date().toISOString().slice(0, 10),
      })
      .select('id')
      .single();
    if (createError) throw createError;
    const address = readAddress(formData);
    if (address) {
      const { error: addressError } = await db.from('client_addresses').insert({
        client_id: client.id,
        postal_code: address.postalCode,
        street: address.street,
        number: address.number,
        complement: address.complement,
        district: address.district,
        city: address.city,
        state: address.state,
        country: address.country,
      });
      if (addressError) throw addressError;
    }
    const { error: auditError } = await createAdminClient().from('audit_logs').insert({
      action: 'client.created',
      target_type: 'client',
      target_id: client.id,
      client_id: client.id,
      actor_internal_user_id: session.internalUser.id,
      reason: 'Cadastro administrativo',
      source: '7service',
    });
    if (auditError) throw auditError;
    revalidatePath('/clientes');
    return { error: null, createdId: client.id };
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
  const session = await requirePermission('clients.manage');

  try {
    const db = await createDbClient();
    const { data: current, error: readError } = await db
      .from('clients')
      .select('id,legal_name')
      .eq('id', clientId)
      .single();
    if (readError || !current) throw new Error('Cliente nao encontrado');
    const { error: writeError } = await db
      .from('clients')
      .update({
        legal_name: String(formData.get('legalName') ?? '').trim(),
        trade_name: formData.get('tradeName')?.toString().trim() || null,
        phone: formData.get('phone')?.toString().trim() || null,
        email: formData.get('email')?.toString().trim() || null,
        contact_name: formData.get('contactName')?.toString().trim() || null,
        notes: formData.get('notes')?.toString().trim() || null,
      })
      .eq('id', clientId);
    if (writeError) throw writeError;
    const address = readAddress(formData);
    if (address) {
      const addressRow = {
        postal_code: address.postalCode,
        street: address.street,
        number: address.number,
        complement: address.complement,
        district: address.district,
        city: address.city,
        state: address.state,
        country: address.country,
      };
      const { data: foundAddress, error: addrReadError } = await db
        .from('client_addresses')
        .select('id')
        .eq('client_id', clientId)
        .order('created_at')
        .limit(1)
        .maybeSingle();
      if (addrReadError) throw addrReadError;
      const result = foundAddress
        ? await db.from('client_addresses').update(addressRow).eq('id', foundAddress.id)
        : await db.from('client_addresses').insert({ client_id: clientId, ...addressRow });
      if (result.error) throw result.error;
    }
    const { error: auditError } = await createAdminClient()
      .from('audit_logs')
      .insert({
        action: 'client.updated',
        target_type: 'client',
        target_id: clientId,
        client_id: clientId,
        actor_internal_user_id: session.internalUser.id,
        source: '7service',
        before_json: { legal_name: current.legal_name },
        after_json: { legal_name: String(formData.get('legalName') ?? '').trim() },
      });
    if (auditError) throw auditError;
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

async function changeClientStatus(
  clientId: string,
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED',
  actorId: string,
  reason: string | null,
) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(clientId))
    throw new Error('Identificador de cliente inválido');
  const { error } = await createAdminClient().rpc('change_client_status_atomic', {
    p_actor: actorId,
    p_client: clientId,
    p_status: status,
    p_reason: reason,
  });
  if (error) throw new Error('Não foi possível atualizar o cliente e confirmar sua auditoria.');
}

export async function suspendClientAction(clientId: string, formData: FormData) {
  const session = await requirePermission('clients.manage');
  const reason = formData.get('reason')?.toString().trim();
  await changeClientStatus(clientId, 'SUSPENDED', session.internalUser.id, reason || null);
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath('/clientes');
}

export async function reactivateClientAction(clientId: string, _formData: FormData) {
  const session = await requirePermission('clients.manage');
  await changeClientStatus(clientId, 'ACTIVE', session.internalUser.id, null);
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath('/clientes');
}

export async function closeClientAction(clientId: string, formData: FormData) {
  const session = await requirePermission('clients.manage');
  const reason = formData.get('reason')?.toString().trim();
  await changeClientStatus(clientId, 'CLOSED', session.internalUser.id, reason || null);
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
  const session = await requirePermission('contracts.manage');

  try {
    const reference = String(formData.get('reference') ?? '').trim();
    const startDate = String(formData.get('startDate') ?? '');
    if (!reference || !/^\\d{4}-\\d{2}-\\d{2}$/.test(startDate))
      return { error: 'Informe referencia e data de inicio validas.' };
    const { error } = await createAdminClient().rpc('create_contract_atomic', {
      p_actor: session.internalUser.id,
      p_client: clientId,
      p_reference: reference,
      p_start: startDate,
      p_end: formData.get('endDate')?.toString() || null,
      p_notes: formData.get('notes')?.toString() || null,
    });
    if (error) throw new Error('Falha ao cadastrar contrato e registrar sua auditoria.');
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
  const { internalUser } = await requirePermission('contracts.manage');
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024) {
    throw new Error('Selecione um PDF de até 10 MB.');
  }
  const raw = new Uint8Array(await file.arrayBuffer());
  const pdfHeader = String.fromCharCode(...raw.slice(0, 5));
  if (file.type !== 'application/pdf' || pdfHeader !== '%PDF-') {
    throw new Error('Somente arquivos PDF válidos são aceitos.');
  }
  const db = createAdminClient();
  const { data: contract, error: contractError } = await db
    .from('contracts')
    .select('id')
    .eq('id', contractId)
    .eq('client_id', clientId)
    .maybeSingle();
  if (contractError || !contract) throw new Error('Contrato não pertence ao cliente.');
  const storagePath = clientId + '/' + contractId + '/' + crypto.randomUUID() + '.pdf';
  const { error: uploadError } = await db.storage
    .from('contract-documents')
    .upload(storagePath, raw, { contentType: 'application/pdf', upsert: false, cacheControl: '0' });
  if (uploadError) throw new Error('Falha ao armazenar o PDF no bucket privado.');
  const { data: document, error: metadataError } = await db
    .from('contract_documents')
    .insert({
      contract_id: contractId,
      storage_path: storagePath,
      original_name: file.name.slice(0, 255),
      mime_type: 'application/pdf',
      size_bytes: file.size,
      signed_document: true,
      uploaded_by: internalUser.id,
    })
    .select('id')
    .single();
  if (metadataError || !document) {
    await db.storage.from('contract-documents').remove([storagePath]);
    throw new Error('Falha ao registrar metadados do documento.');
  }
  const { error: auditError } = await db.from('audit_logs').insert({
    actor_internal_user_id: internalUser.id,
    action: 'contract.document_uploaded',
    target_type: 'contract_document',
    target_id: document.id,
    client_id: clientId,
    reason: 'Documento PDF do contrato ' + contractId,
    source: '7service',
  });
  if (auditError) {
    await db.from('contract_documents').delete().eq('id', document.id);
    await db.storage.from('contract-documents').remove([storagePath]);
    throw new Error('Upload desfeito porque a auditoria não foi registrada.');
  }
  revalidatePath('/clientes/' + clientId);
}

export interface SubscriptionFormState {
  error: string | null;
}

export async function createSubscriptionAction(
  clientId: string,
  _prevState: SubscriptionFormState,
  formData: FormData,
): Promise<SubscriptionFormState> {
  const session = await requirePermission('contracts.manage');

  try {
    const db = await createDbClient();
    const contractId = String(formData.get('contractId') ?? '');
    const productId = String(formData.get('productId') ?? '');
    const startDate = String(formData.get('startDate') ?? '');
    const licenseLimit = Number(formData.get('licenseLimit'));
    if (
      !/^\\d{4}-\\d{2}-\\d{2}$/.test(startDate) ||
      !Number.isInteger(licenseLimit) ||
      licenseLimit < 0
    )
      return { error: 'Informe data e licencas validas.' };
    const { data: contract, error: contractError } = await db
      .from('contracts')
      .select('id')
      .eq('id', contractId)
      .eq('client_id', clientId)
      .maybeSingle();
    if (contractError || !contract) return { error: 'Contrato nao pertence ao cliente.' };
    const { data: subscription, error } = await db
      .from('subscriptions')
      .insert({
        client_id: clientId,
        contract_id: contractId,
        product_id: productId,
        start_date: startDate,
        end_date: formData.get('endDate')?.toString() || null,
        grace_days: Number(formData.get('graceDays') ?? 5),
        license_limit: licenseLimit,
        monthly_value: formData.get('monthlyValue') ? Number(formData.get('monthlyValue')) : null,
        implementation_value: formData.get('implementationValue')
          ? Number(formData.get('implementationValue'))
          : null,
      })
      .select('id')
      .single();
    if (error || !subscription) throw error ?? new Error('Falha ao cadastrar assinatura');
    const { error: auditError } = await createAdminClient().from('audit_logs').insert({
      action: 'subscription.created',
      target_type: 'subscription',
      target_id: subscription.id,
      client_id: clientId,
      product_id: productId,
      actor_internal_user_id: session.internalUser.id,
      source: '7service',
    });
    if (auditError) throw auditError;
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
  const session = await requirePermission('clients.manage');
  const note = formData.get('reason')?.toString().trim();
  const { error } = await createAdminClient()
    .from('audit_logs')
    .insert({
      action: 'client.export_delivered',
      target_type: 'client',
      target_id: clientId,
      client_id: clientId,
      actor_internal_user_id: session.internalUser.id,
      reason: note || null,
      source: '7service',
    });
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
}

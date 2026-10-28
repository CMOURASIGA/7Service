import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ contractId: string; documentId: string }>;
  },
) {
  const { internalUser } = await requirePermission('clients.view');
  const { contractId, documentId } = await params;
  if (!uuid.test(contractId) || !uuid.test(documentId))
    return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 });
  const db = createAdminClient();
  const { data: contract, error: contractError } = await db
    .from('contracts')
    .select('id,client_id')
    .eq('id', contractId)
    .maybeSingle();
  if (contractError || !contract)
    return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
  const { data: document, error } = await db
    .from('contract_documents')
    .select('id,storage_path')
    .eq('id', documentId)
    .eq('contract_id', contractId)
    .maybeSingle();
  if (error || !document)
    return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
  if (!document.storage_path.startsWith(contract.client_id + '/' + contractId + '/'))
    return NextResponse.json({ error: 'Caminho de arquivo inconsistente' }, { status: 403 });
  const { data: signed, error: signError } = await db.storage
    .from('contract-documents')
    .createSignedUrl(document.storage_path, 60);
  if (signError || !signed?.signedUrl)
    return NextResponse.json({ error: 'Não foi possível emitir URL temporária' }, { status: 503 });
  const { error: auditError } = await db.from('audit_logs').insert({
    actor_internal_user_id: internalUser.id,
    action: 'contract.document_requested',
    target_type: 'contract_document',
    target_id: documentId,
    client_id: contract.client_id,
    source: '7service',
  });
  if (auditError) return NextResponse.json({ error: 'Auditoria indisponível' }, { status: 503 });
  return NextResponse.redirect(signed.signedUrl, {
    status: 303,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}

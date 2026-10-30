import { NextRequest, NextResponse } from 'next/server';

import { requireInternalAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadPrivateContractPdf } from '@/lib/contracts/private-storage';
import { AppError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ contractId: string }> };

function failure(error: unknown): NextResponse {
  if (error instanceof AppError) {
    const status = error.code === 'UNAUTHENTICATED' ? 401 :
      error.code === 'FORBIDDEN' ? 403 :
      error.code === 'NOT_FOUND' ? 404 :
      error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ error: 'Falha ao processar documento' }, { status: 500 });
}

export async function GET(_request: NextRequest, context: Context) {
  try {
    await requireInternalAdmin();
    const { contractId } = await context.params;
    const { data, error } = await createAdminClient().from('contract_files')
      .select('id,original_name,size_bytes,signed_document,uploaded_at')
      .eq('contract_id', contractId).order('uploaded_at', { ascending: false });
    if (error) throw new AppError('UNEXPECTED_ERROR', 'Falha ao consultar documentos');
    return NextResponse.json({ documents: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    await requireInternalAdmin();
    const { contractId } = await context.params;
    const declaredLength = request.headers.get('content-length');
    const contentLength = declaredLength === null ? 0 : Number(declaredLength);
    if (!Number.isFinite(contentLength) || contentLength < 0) return NextResponse.json({ error: 'Tamanho inválido' }, { status: 400 });
    if (contentLength > 11 * 1024 * 1024) return NextResponse.json({ error: 'Arquivo excede o limite' }, { status: 413 });
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Informe um PDF' }, { status: 400 });
    if (file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024 || file.size === 0)
      return NextResponse.json({ error: 'PDF inválido ou muito grande' }, { status: 400 });
    const result = await uploadPrivateContractPdf({
      contractId, originalName: file.name, bytes: new Uint8Array(await file.arrayBuffer()),
      signedDocument: form.get('signedDocument') === 'true',
    });
    return NextResponse.json({ document: result }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}

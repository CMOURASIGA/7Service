import { NextResponse } from 'next/server';
import { requireInternalAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPrivateContractPdfUrl } from '@/lib/contracts/private-storage';
import { AppError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ contractId: string; documentId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    await requireInternalAdmin();
    const { contractId, documentId } = await context.params;
    const { data, error } = await createAdminClient().from('contract_files')
      .select('storage_path').eq('contract_id', contractId).eq('id', documentId).single();
    if (error || !data) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    const url = await createPrivateContractPdfUrl(data.storage_path);
    return NextResponse.json({ url, expiresInSeconds: 60 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = error instanceof AppError ? (error.code === 'UNAUTHENTICATED' ? 401 : error.code === 'FORBIDDEN' ? 403 : error.code === 'NOT_FOUND' ? 404 : 500) : 500;
    return NextResponse.json({ error: 'Não foi possível acessar o documento' }, { status });
  }
}

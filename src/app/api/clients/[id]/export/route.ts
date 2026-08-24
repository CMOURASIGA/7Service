import { NextResponse } from 'next/server';

import { getCurrentSession } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { buildClientExportPackage } from '@/services/export';

/**
 * Gera e devolve o pacote de exportação do cliente (Etapa 14).
 * A geração em si já é auditada por `buildClientExportPackage`.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();

  try {
    const pkg = buildClientExportPackage(id, session.internalUser);
    return new NextResponse(JSON.stringify(pkg, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="cliente-${id}-export.json"`,
      },
    });
  } catch (error) {
    if (isAppError(error) && error.code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }
    throw error;
  }
}

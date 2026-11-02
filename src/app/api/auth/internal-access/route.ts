import { NextResponse } from 'next/server';

import { isAppError } from '@/lib/errors';
import { requirePermission } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requirePermission('clients.view');
    return NextResponse.json({ authorized: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (isAppError(error) && (error.code === 'FORBIDDEN' || error.code === 'UNAUTHENTICATED')) {
      return NextResponse.json(
        { authorized: false },
        {
          status: error.code === 'UNAUTHENTICATED' ? 401 : 403,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }
    return NextResponse.json(
      { error: 'Verificação administrativa indisponível' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

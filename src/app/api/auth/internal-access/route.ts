import { NextResponse } from 'next/server';

import { requirePermission } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

export async function GET() {
  try {
    // Distinguish missing/expired authentication (401) from an authenticated
    // user without internal permissions (403).
    const supabase = await createClient();
    const { data: auth, error } = await supabase.auth.getUser();
    if (error || !auth.user) {
      return NextResponse.json({ authorized: false }, { status: 401, headers: noStore });
    }

    await requirePermission('clients.view');
    return NextResponse.json({ authorized: true }, { status: 200, headers: noStore });
  } catch (error) {
    if (isAppError(error) && (error.code === 'FORBIDDEN' || error.code === 'UNAUTHENTICATED')) {
      return NextResponse.json({ authorized: false }, { status: 403, headers: noStore });
    }
    return NextResponse.json(
      { error: 'Verificação administrativa indisponível' },
      { status: 503, headers: noStore },
    );
  }
}

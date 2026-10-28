import { NextResponse } from 'next/server';

import { getServerEnv } from '@/config/env';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Readiness differs from liveness. A running Next.js process is not evidence
 * that the central administrative database is available.
 * Do not expose credentials, internal errors, table content or project IDs.
 */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store, max-age=0' };
  try {
    getServerEnv();
    const db = createAdminClient();
    const { error } = await db.from('clients').select('id', { head: true, count: 'exact' });
    if (error) {
      return NextResponse.json({ status: 'unavailable', checks: { database: 'failed' } }, { status: 503, headers });
    }
    return NextResponse.json({ status: 'ready', checks: { database: 'ok' } }, { headers });
  } catch {
    return NextResponse.json({ status: 'unavailable', checks: { database: 'failed' } }, { status: 503, headers });
  }
}

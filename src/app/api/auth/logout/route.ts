import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentSession } from '@/lib/auth/session';
import { recordAdminEvent } from '@/lib/audit/record-admin-event';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // A cookie-authenticated logout request must originate from this host.
  // Do not accept requests from other origins.
  const origin = request.headers.get('origin');
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Origem inválida' }, { status: 403 });
  }

  // Capture the operator identity before the authentication cookies are cleared.
  // Audit is best-effort and must never block a successful secure logout.
  const session = await getCurrentSession().catch(() => null);
  const supabase = await createClient();
  // Server-side signOut removes the auth cookies through the SSR cookie adapter.
  // No credentials or tokens are returned or written to logs.
  const { error } = await supabase.auth.signOut();
  if (error) {
    return NextResponse.json(
      { error: 'Não foi possível encerrar a sessão' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (session) {
    try {
      await recordAdminEvent({
        actorInternalUserId: session.internalUser.id,
        action: 'auth.logout',
        targetType: 'internal_user',
        targetId: session.internalUser.id,
      });
    } catch {
      // An audit storage outage never leaves an operator signed in.
    }
  }
  return NextResponse.json({ signedOut: true }, { headers: { 'Cache-Control': 'no-store' } });
}

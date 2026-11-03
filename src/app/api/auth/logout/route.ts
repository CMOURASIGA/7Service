import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // A cookie-authenticated logout request must originate from this host.
  // Do not accept requests from other origins.
  const origin = request.headers.get('origin');
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Origem inválida' }, { status: 403 });
  }

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
  return NextResponse.json({ signedOut: true }, { headers: { 'Cache-Control': 'no-store' } });
}

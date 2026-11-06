import { NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const auth = await createClient();
  const {
    data: { user },
    error: authenticationError,
  } = await auth.auth.getUser();
  if (authenticationError || !user || !user.email_confirmed_at) {
    return NextResponse.json({ error: 'Sessão confirmada necessária' }, { status: 401 });
  }

  const { data, error } = await createAdminClient().rpc('activate_identity_after_auth_atomic', {
    p_auth_user_id: user.id,
  });
  if (error || data !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'Identidade não habilitada para ativação' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return NextResponse.json({ activated: true }, { headers: { 'Cache-Control': 'no-store' } });
}

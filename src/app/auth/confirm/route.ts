import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  // Never honor an arbitrary redirect URL from the email.
  const destination = type === 'recovery' ? '/redefinir-senha' : '/aceitar-convite';
  const fail = () => NextResponse.redirect(new URL('/login?auth_error=invalid_link', request.url));
  if (!code && (!tokenHash || !['invite', 'recovery'].includes(type ?? ''))) return fail();

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: type as 'invite' | 'recovery',
      });
  if (error) return fail();
  return NextResponse.redirect(new URL(destination, request.url));
}

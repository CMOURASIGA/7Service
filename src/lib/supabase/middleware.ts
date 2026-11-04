import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { getPublicEnv } from '@/config/env';
import { isMachineEntitlementRoute } from '@/lib/auth/machine-route';

/**
 * Refresca a sessão Supabase a cada requisição e mantém os cookies
 * sincronizados entre o browser e o servidor.
 *
 * IMPORTANTE: isto é apenas UX/roteamento. A autorização real de cada
 * operação privilegiada precisa ser revalidada no backend
 * (docs/01-architecture/AUTHORIZATION.md - "Backend como autoridade").
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = getPublicEnv();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname === '/login';
  const isPublicAuthFlow =
    request.nextUrl.pathname === '/aceitar-convite' ||
    request.nextUrl.pathname === '/esqueci-senha' ||
    request.nextUrl.pathname === '/redefinir-senha' ||
    request.nextUrl.pathname === '/auth/confirm' ||
    request.nextUrl.pathname === '/acesso-restrito';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isPublicAsset =
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/health');

  // Machine endpoints do not carry a browser session; the handler itself
  // validates a product-specific server token before returning any data.
  if (!user && isMachineEntitlementRoute(request.nextUrl.pathname, request.method)) {
    return response;
  }

  // This endpoint owns its exact HTTP 401/403/200 JSON contract.
  // Never intercept it with the generic API authentication response.
  if (request.nextUrl.pathname === '/api/auth/internal-access' && request.method === 'GET') {
    return response;
  }

  // INT-01: the machine-to-machine decision endpoint authenticates a bearer JWT
  // in its own handler. Do not require a browser cookie at the proxy layer.
  // Keep the exception scoped to this exact method and path.
  if (
    request.method === 'GET' &&
    request.nextUrl.pathname === '/api/v1/authorization/decision'
  ) {
    return response;
  }

  if (!user && isApiRoute && !isPublicAsset) {
    return NextResponse.json(
      { error: 'Sessão necessária' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (!user && !isAuthRoute && !isPublicAuthFlow && !isPublicAsset) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthRoute) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    homeUrl.search = '';
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

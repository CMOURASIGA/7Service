import { NextResponse, type NextRequest } from 'next/server';

import { isSupabaseConfigured } from '@/config/env';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    // MODO DEMONSTRAÇÃO (docs/MIGRATIONS.md - "Estado atual"): sem projeto
    // Supabase provisionado não há sessão real para validar. A requisição
    // segue livre; a autorização por sessão volta a valer automaticamente
    // assim que NEXT_PUBLIC_SUPABASE_URL/ANON_KEY forem configuradas.
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica a todas as rotas exceto assets estáticos e imagens otimizadas.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getPublicEnv } from '@/config/env';
import type { Database } from '@/types/database';

/**
 * Cliente Supabase para uso em Server Components, Route Handlers e Server Actions.
 * Respeita a sessão do usuário autenticado (RLS aplicada normalmente).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll chamado a partir de um Server Component sem escrita de cookie.
            // Ignorado porque o middleware é responsável por refrescar a sessão.
          }
        },
      },
    },
  );
}

'use client';

import { createBrowserClient } from '@supabase/ssr';

import { getPublicEnv } from '@/config/env';
import type { Database } from '@/types/database';

/**
 * Cliente Supabase para uso em Client Components.
 * Usa apenas a anon key pública — nunca a service role.
 */
export function createClient() {
  const env = getPublicEnv();

  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

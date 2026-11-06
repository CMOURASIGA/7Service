import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { getServerEnv } from '@/config/env';
import type { Database } from '@/types/database';

/**
 * Cliente Supabase com Service Role.
 *
 * REGRA DE ARQUITETURA (docs/01-architecture/SECURITY.md):
 * - Uso restrito a operações privilegiadas de backend (Route Handlers,
 *   Server Actions, jobs). NUNCA importar em código de Client Component.
 * - O import de "server-only" garante falha de build caso este módulo
 *   seja incluído acidentalmente no bundle do cliente.
 */
export function createAdminClient() {
  const env = getServerEnv();

  return createSupabaseClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

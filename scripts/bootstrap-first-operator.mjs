/**
 * One-time, server-side operator bootstrap. Never run in a browser or CI.
 * Required environment variables:
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BOOTSTRAP_ADMIN_EMAIL.
 * Requires the versioned bootstrap RPC and a fresh central database with no
 * internal users. It never creates an Auth user or sends an invitation.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? '').trim().toLowerCase();
if (!url || !key || !/^\S+@\S+\.\S+$/.test(email)) {
  throw new Error('Set Supabase server URL, service-role key and admin email.');
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: operatorId, error } = await db.rpc('bootstrap_first_super_admin', {
  p_expected_email: email,
});
if (error || !operatorId)
  throw new Error(`Bootstrap failed: ${error?.message ?? 'no operator id'}`);
console.log('First operator is linked to SUPER_ADMIN and audited. No Auth user was created.');

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Server-only connection primitives for existing Supabase projects.
 *
 * Credentials must be persisted as encrypted strings in a private table after
 * the additive schema migration. Never send them to the browser or audit log.
 * The admin client bypasses RLS: only call it after 7Service permission,
 * contract, installation and tenant checks.
 */
export type SealedCredential = string & { readonly __sealedCredential: unique symbol };

export function validateSupabaseProjectUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('INVALID_SUPABASE_URL');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)
  ) {
    throw new Error('INVALID_SUPABASE_URL');
  }
  return url.origin;
}

function encryptionKey(): Buffer {
  const value = process.env.SERVICE_CONNECTION_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value))
    throw new Error('CONNECTION_ENCRYPTION_KEY_UNAVAILABLE');
  return Buffer.from(value, 'hex');
}

/** Version 1: 12-byte nonce + 16-byte GCM tag; tampering fails closed. */
export function sealConnectionSecret(secret: string): SealedCredential {
  if (!secret || secret.trim() !== secret || secret.length < 16)
    throw new Error('INVALID_CONNECTION_SECRET');
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), nonce);
  const payload = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [
    'v1',
    nonce.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    payload.toString('base64url'),
  ].join('.') as SealedCredential;
}

export function unsealConnectionSecret(encrypted: SealedCredential): string {
  const chunks = encrypted.split('.');
  if (chunks.length !== 4 || chunks[0] !== 'v1') throw new Error('INVALID_SEALED_SECRET');
  try {
    const nonce = Buffer.from(chunks[1], 'base64url');
    const tag = Buffer.from(chunks[2], 'base64url');
    if (nonce.length !== 12 || tag.length !== 16) throw new Error('INVALID_SEALED_SECRET');
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(chunks[3], 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('INVALID_SEALED_SECRET');
  }
}

/** Never expose this client or its auth credentials in a client component. */
export function destinationAdminClient(
  projectUrl: string,
  encryptedKey: SealedCredential,
): SupabaseClient {
  return createClient(
    validateSupabaseProjectUrl(projectUrl),
    unsealConnectionSecret(encryptedKey),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-7service-integration': 'server' } },
    },
  );
}

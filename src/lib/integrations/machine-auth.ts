import { timingSafeEqual } from 'node:crypto';

export type MachineProduct = '7COMMANDER' | '7CLINIC';

export function tokenMatches(provided: string | null, secret: string | undefined): boolean {
  if (!provided?.startsWith('Bearer ') || !secret || secret.length < 32) return false;
  const candidate = Buffer.from(provided.slice(7), 'utf8');
  const expected = Buffer.from(secret, 'utf8');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function productFromPath(value: string): MachineProduct | null {
  const product = value.toUpperCase();
  return product === '7COMMANDER' || product === '7CLINIC' ? product : null;
}

export function machineProductSecret(product: MachineProduct): string | undefined {
  return product === '7COMMANDER'
    ? process.env.SERVICE_TOKEN_7COMMANDER
    : process.env.SERVICE_TOKEN_7CLINIC;
}

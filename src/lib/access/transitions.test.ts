import { describe, expect, it } from 'vitest';
import { assertAccessReason, assertAccessTransition } from './transitions';

describe('access state transitions', () => {
  it.each([
    ['PENDING', 'ACTIVE'],
    ['ACTIVE', 'SUSPENDED'],
    ['SUSPENDED', 'ACTIVE'],
    ['ACTIVE', 'REVOKED'],
    ['REVOKED', 'REVOKED'],
    ['EXPIRED', 'EXPIRED'],
  ] as const)('allows %s to %s', (from, to) => {
    expect(() => assertAccessTransition(from, to)).not.toThrow();
  });

  it.each([
    ['REVOKED', 'ACTIVE'],
    ['EXPIRED', 'ACTIVE'],
    ['ACTIVE', 'PENDING'],
    ['REVOKED', 'SUSPENDED'],
  ] as const)('denies %s to %s', (from, to) => {
    expect(() => assertAccessTransition(from, to)).toThrow();
  });

  it('requires an explanation for suspension or revocation', () => {
    expect(() => assertAccessReason('SUSPENDED', ' ')).toThrow();
    expect(() => assertAccessReason('REVOKED', 'bad')).toThrow();
    expect(() => assertAccessReason('REVOKED', 'Solicitação do administrador')).not.toThrow();
    expect(() => assertAccessReason('ACTIVE')).not.toThrow();
  });
});

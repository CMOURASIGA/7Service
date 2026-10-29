import { describe, expect, it } from 'vitest';
import { assertUniqueEnvironment, validateProductEnvironment } from './validation';

describe('environment validation', () => {
  it('normalizes a valid HTTPS URL', () => {
    expect(validateProductEnvironment({environment:'homologation',entryUrl:' https://preview.example.com ',versionSha:'c44d8f0'})).toEqual({
      environment:'homologation',entryUrl:'https://preview.example.com',databaseResourceRef:null,versionSha:'c44d8f0'
    });
  });
  it('rejects HTTP URLs', () => {
    expect(() => validateProductEnvironment({environment:'production',entryUrl:'http://example.com'})).toThrow();
  });
  it('rejects invalid SHAs', () => {
    expect(() => validateProductEnvironment({environment:'development',versionSha:'invalid-sha'})).toThrow();
  });
  it('prevents duplicate deployment environment entries', () => {
    const existing = [{ deploymentId: 'deployment-1', environment: 'production' as const }];
    expect(() => assertUniqueEnvironment(existing, 'deployment-1', 'production')).toThrow();
    expect(() => assertUniqueEnvironment(existing, 'deployment-1', 'homologation')).not.toThrow();
    expect(() => assertUniqueEnvironment(existing, 'deployment-2', 'production')).not.toThrow();
  });
  it('rejects URLs with credentials', () => {
    expect(() => validateProductEnvironment({environment:'production',entryUrl:'https://user:pass@example.com'})).toThrow();
  });
  it('rejects fragment-bearing URLs', () => {
    expect(() => validateProductEnvironment({environment:'homologation',entryUrl:'https://example.com/#token'})).toThrow();
  });
  it('rejects unsupported environment kinds at runtime', () => {
    expect(() => validateProductEnvironment({environment:'staging' as never})).toThrow();
  });
  it('rejects invalid resource names', () => {
    expect(() => validateProductEnvironment({environment:'development',databaseResourceRef:'unsafe\nref'})).toThrow();
  });
});

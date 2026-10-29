import { describe, expect, it } from 'vitest';
import { validateProductEnvironment } from './validation';

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
  it('rejects invalid resource names', () => {
    expect(() => validateProductEnvironment({environment:'development',databaseResourceRef:'unsafe\nref'})).toThrow();
  });
});

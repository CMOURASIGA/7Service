import { describe, expect, it } from 'vitest';
import { passwordValidationError } from './password-rules';

describe('passwordValidationError', () => {
  it('rejects passwords shorter than 12 characters', () => {
    expect(passwordValidationError('12345678901', '12345678901')).toMatch(/12 caracteres/);
  });
  it('rejects different confirmations', () => {
    expect(passwordValidationError('long-valid-password', 'another-password')).toMatch(
      /não coincidem/,
    );
  });
  it('allows equal passwords with at least 12 characters', () => {
    expect(passwordValidationError('long-valid-password', 'long-valid-password')).toBeNull();
  });
});

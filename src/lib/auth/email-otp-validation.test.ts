import { describe, expect, it } from 'vitest';

import { isValidEmailOtp } from './email-otp-validation';

describe('isValidEmailOtp', () => {
  it('accepts the QA email with an eight-digit OTP', () => {
    expect(isValidEmailOtp('cmourasiga@gmail.com', '12345678')).toBe(true);
  });
  it('accepts a six-digit OTP and normalizes email spacing', () => {
    expect(isValidEmailOtp(' Test.User@example.com ', ' 123456 ')).toBe(true);
  });
  it('rejects invalid emails and OTP formats', () => {
    expect(isValidEmailOtp('invalid-email', '12345678')).toBe(false);
    expect(isValidEmailOtp('user@example.com', '12345')).toBe(false);
    expect(isValidEmailOtp('user@example.com', '123456789')).toBe(false);
    expect(isValidEmailOtp('user@example.com', '1234ab78')).toBe(false);
  });
});

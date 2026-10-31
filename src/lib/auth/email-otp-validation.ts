export function isValidEmailOtp(email: string, token: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedToken = token.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) &&
    /^\d{6,8}$/.test(normalizedToken);
}

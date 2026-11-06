/** Redirects after authentication must be local and never target a protocol-relative URL. */
export function safeAdminRedirect(candidate: string | null): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return '/';
  if (candidate.includes('\\') || /[\x00-\x1f\x7f]/.test(candidate)) return '/';
  return candidate;
}

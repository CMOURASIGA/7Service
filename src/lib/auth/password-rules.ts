/** Shared validation for invitation acceptance and password recovery. */
export function passwordValidationError(password: string, confirmation: string): string | null {
  if (password.length < 12) return 'A senha deve conter pelo menos 12 caracteres.';
  if (password !== confirmation) return 'As senhas informadas não coincidem.';
  return null;
}

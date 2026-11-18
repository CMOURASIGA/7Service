/** Public label only. Database product codes, IDs, contracts and integrations are unchanged. */
export function displayProductName(name: string | null | undefined): string {
  return name === '7Commander' ? 'Commander' : (name ?? '');
}

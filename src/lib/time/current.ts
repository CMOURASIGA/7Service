/** Clock read in a server-side utility to keep UI rendering deterministic. */
export function getCurrentTimeMs(): number {
  return Date.now();
}

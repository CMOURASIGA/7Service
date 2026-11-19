/**
 * Resolve a destination using the authoritative server-side contract mapping.
 * Client input must never supply a remote project URL or override installation.
 */
export interface InstallationBinding {
  clientId: string;
  productId: string;
  deploymentId: string;
  environmentId: string;
  environment: 'PRODUCTION' | 'HOMOLOGATION' | 'DEVELOPMENT' | 'DEMO';
  status: 'ACTIVE' | 'SUSPENDED' | 'RETIRED' | 'PLANNED';
}
export type RoutingDecision =
  | { ok: true; installation: InstallationBinding }
  | { ok: false; reason: 'NO_ACTIVE_INSTALLATION' | 'AMBIGUOUS_INSTALLATION' };

export function resolveInstallation(
  clientId: string,
  productId: string,
  environment: InstallationBinding['environment'],
  bindings: readonly InstallationBinding[],
): RoutingDecision {
  const matches = bindings.filter(
    (b) =>
      b.clientId === clientId &&
      b.productId === productId &&
      b.environment === environment &&
      b.status === 'ACTIVE',
  );
  if (!matches.length) return { ok: false, reason: 'NO_ACTIVE_INSTALLATION' };
  if (matches.length !== 1) return { ok: false, reason: 'AMBIGUOUS_INSTALLATION' };
  return { ok: true, installation: matches[0] };
}

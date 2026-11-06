/** Only advertise a customer-specific live deployment, never a generic product link.
 * An authorized installation is required before its URL can be distributed.
 */
export type CustomerDeployment = {
  deployment_id: string;
  client_id: string;
  product_id: string;
};

export type CustomerEnvironment = {
  deployment_id: string;
  environment: string;
  status: string;
  entry_url: string | null;
};

function isSafeHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.hash &&
      url.hostname.length > 0
    );
  } catch {
    return false;
  }
}

export function customerProductEntryUrl(
  clientId: string,
  productId: string,
  assignments: CustomerDeployment[],
  environments: CustomerEnvironment[],
): string | null {
  const assignedDeploymentIds = new Set(
    assignments
      .filter((row) => row.client_id === clientId && row.product_id === productId)
      .map((row) => row.deployment_id),
  );
  if (!assignedDeploymentIds.size) return null;
  const matches = environments.filter(
    (row) =>
      assignedDeploymentIds.has(row.deployment_id) &&
      row.environment === 'PRODUCTION' &&
      row.status === 'ACTIVE' &&
      row.entry_url &&
      isSafeHttpsUrl(row.entry_url),
  );
  // Multiple active production links for a single customer/product are ambiguous:
  // fail closed instead of selecting an arbitrary destination.
  return matches.length === 1 ? matches[0].entry_url : null;
}

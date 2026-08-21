import type {
  LicenseOverride,
  LicenseUsage,
  Subscription,
  SubscriptionEffectiveStatus,
  SubscriptionStatus,
  UserProductAccess,
} from '@/types/domain';

/**
 * Regras de domínio puras e sem I/O, espelhando exatamente as funções SQL
 * equivalentes definidas nas migrations (para que o comportamento não
 * divirja entre o mock atual e o Supabase real no futuro):
 *
 * - `subscription_effective_status()` -> `getSubscriptionEffectiveStatus`
 * - `subscription_license_usage()`    -> `getLicenseUsage`
 *
 * Ver docs/03-domains/LICENSES.md e docs/01-architecture/ACCESS_DECISION.md.
 */

type NonTemporalStatus = Extract<SubscriptionStatus, 'SUSPENDED' | 'CANCELLED' | 'DRAFT'>;

function isNonTemporalStatus(status: SubscriptionStatus): status is NonTemporalStatus {
  return status === 'SUSPENDED' || status === 'CANCELLED' || status === 'DRAFT';
}

export function getSubscriptionEffectiveStatus(
  subscription: Pick<Subscription, 'status' | 'endDate' | 'graceDays'>,
  referenceDate: Date = new Date(),
): SubscriptionEffectiveStatus {
  if (isNonTemporalStatus(subscription.status)) {
    return subscription.status;
  }

  if (!subscription.endDate) {
    return 'ACTIVE';
  }

  const today = dateOnly(referenceDate);
  const end = new Date(subscription.endDate);
  const graceEnd = new Date(end);
  graceEnd.setDate(graceEnd.getDate() + subscription.graceDays);

  if (today <= end) {
    return 'ACTIVE';
  }
  if (today <= graceEnd) {
    return 'GRACE_PERIOD';
  }
  return 'BLOCKED';
}

/** Acessos que consomem licença: PENDING e ACTIVE (docs/01-architecture/DATABASE_RELATIONSHIPS.md). */
const LICENSE_CONSUMING_STATUSES = new Set(['PENDING', 'ACTIVE']);

export function getLicenseUsage(
  subscription: Pick<Subscription, 'id' | 'licenseLimit'>,
  allAccess: Pick<UserProductAccess, 'subscriptionId' | 'status'>[],
  overrides: Pick<LicenseOverride, 'subscriptionId' | 'extraLicenses'>[],
): LicenseUsage {
  const used = allAccess.filter(
    (access) =>
      access.subscriptionId === subscription.id && LICENSE_CONSUMING_STATUSES.has(access.status),
  ).length;

  const extraLicenses = overrides
    .filter((override) => override.subscriptionId === subscription.id)
    .reduce((sum, override) => sum + override.extraLicenses, 0);

  const licenseLimit = subscription.licenseLimit;

  return {
    licenseLimit,
    extraLicenses,
    used,
    available: licenseLimit + extraLicenses - used,
  };
}

export function canGrantAccess(usage: LicenseUsage): boolean {
  return usage.available > 0;
}

function dateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

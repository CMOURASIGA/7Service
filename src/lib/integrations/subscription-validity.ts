/**
 * Date-only entitlement window. All comparisons use UTC calendar days,
 * independent of the Vercel worker's local timezone.
 */
function dayNumber(isoDate: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return NaN;
  const value = Date.parse(isoDate + 'T00:00:00.000Z');
  return Number.isFinite(value) ? Math.floor(value / 86400000) : NaN;
}

export function subscriptionInAccessWindow(
  input: {
    status: string;
    startDate: string;
    endDate: string | null;
    graceDays: number | null;
  },
  todayIso: string,
): boolean {
  if (input.status !== 'ACTIVE') return false;
  const today = dayNumber(todayIso);
  const start = dayNumber(input.startDate);
  if (!Number.isFinite(today) || !Number.isFinite(start) || today < start) return false;
  if (input.endDate === null) return true;
  const end = dayNumber(input.endDate);
  const grace = input.graceDays ?? 0;
  if (!Number.isFinite(end) || !Number.isInteger(grace) || grace < 0) return false;
  return today <= end + grace;
}

import { describe, expect, it } from 'vitest';
import { subscriptionInAccessWindow } from './subscription-validity';

describe('subscriptionInAccessWindow', () => {
  const subscription = { status: 'ACTIVE', startDate: '2026-10-01',
    endDate: '2026-10-30', graceDays: 3 };
  it('allows the exact end date and defined grace period', () => {
    expect(subscriptionInAccessWindow(subscription, '2026-10-30')).toBe(true);
    expect(subscriptionInAccessWindow(subscription, '2026-11-02')).toBe(true);
    expect(subscriptionInAccessWindow(subscription, '2026-11-03')).toBe(false);
  });
  it('denies suspended subscriptions and pre-start access', () => {
    expect(subscriptionInAccessWindow({...subscription,status:'SUSPENDED'},'2026-10-15')).toBe(false);
    expect(subscriptionInAccessWindow(subscription, '2026-09-30')).toBe(false);
  });
  it('does not permit malformed or negative grace windows', () => {
    expect(subscriptionInAccessWindow({...subscription,graceDays:-1},'2026-10-30')).toBe(false);
    expect(subscriptionInAccessWindow({...subscription,endDate:'invalid'},'2026-10-30')).toBe(false);
  });
  it('accepts active open-ended subscriptions', () => {
    expect(subscriptionInAccessWindow({...subscription,endDate:null},'2026-11-30')).toBe(true);
  });
});

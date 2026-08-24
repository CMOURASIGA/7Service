import { describe, expect, it } from 'vitest';

import { canGrantAccess, getLicenseUsage, getSubscriptionEffectiveStatus } from './domain-rules';

describe('getSubscriptionEffectiveStatus', () => {
  const reference = new Date('2026-09-10T12:00:00Z');

  it('retorna ACTIVE quando dentro da vigência', () => {
    const status = getSubscriptionEffectiveStatus(
      { status: 'ACTIVE', endDate: '2026-09-30', graceDays: 5 },
      reference,
    );
    expect(status).toBe('ACTIVE');
  });

  it('retorna ACTIVE quando não há end_date', () => {
    const status = getSubscriptionEffectiveStatus(
      { status: 'ACTIVE', endDate: null, graceDays: 5 },
      reference,
    );
    expect(status).toBe('ACTIVE');
  });

  it('retorna GRACE_PERIOD durante os 5 dias após o fim (exemplo da doc: fim 31/08, carência 01/09-05/09)', () => {
    const status = getSubscriptionEffectiveStatus(
      { status: 'ACTIVE', endDate: '2026-08-31', graceDays: 5 },
      new Date('2026-09-05T12:00:00Z'),
    );
    expect(status).toBe('GRACE_PERIOD');
  });

  it('retorna BLOCKED a partir do 6º dia após o fim', () => {
    const status = getSubscriptionEffectiveStatus(
      { status: 'ACTIVE', endDate: '2026-08-31', graceDays: 5 },
      new Date('2026-09-06T12:00:00Z'),
    );
    expect(status).toBe('BLOCKED');
  });

  it('respeita status administrativo bruto (SUSPENDED/CANCELLED/DRAFT) independente da data', () => {
    expect(
      getSubscriptionEffectiveStatus(
        { status: 'SUSPENDED', endDate: null, graceDays: 5 },
        reference,
      ),
    ).toBe('SUSPENDED');
    expect(
      getSubscriptionEffectiveStatus(
        { status: 'CANCELLED', endDate: null, graceDays: 5 },
        reference,
      ),
    ).toBe('CANCELLED');
  });
});

describe('getLicenseUsage / canGrantAccess', () => {
  const subscription = { id: 'sub-1', licenseLimit: 20 };

  it('calcula uso e disponibilidade considerando apenas PENDING/ACTIVE', () => {
    const access = [
      { subscriptionId: 'sub-1', status: 'ACTIVE' },
      { subscriptionId: 'sub-1', status: 'ACTIVE' },
      { subscriptionId: 'sub-1', status: 'REVOKED' },
      { subscriptionId: 'sub-2', status: 'ACTIVE' },
    ] as const;

    const usage = getLicenseUsage(subscription, [...access], []);

    expect(usage.used).toBe(2);
    expect(usage.available).toBe(18);
  });

  it('bloqueia concessão quando limite atingido (exemplo da doc: 20/20 -> 21º bloqueado)', () => {
    const access = Array.from({ length: 20 }, () => ({
      subscriptionId: 'sub-1',
      status: 'ACTIVE' as const,
    }));

    const usage = getLicenseUsage(subscription, access, []);

    expect(usage.available).toBe(0);
    expect(canGrantAccess(usage)).toBe(false);
  });

  it('override de licença aumenta a disponibilidade e é auditável por motivo/responsável', () => {
    const access = Array.from({ length: 20 }, () => ({
      subscriptionId: 'sub-1',
      status: 'ACTIVE' as const,
    }));
    const overrides = [{ subscriptionId: 'sub-1', extraLicenses: 3 }];

    const usage = getLicenseUsage(subscription, access, overrides);

    expect(usage.available).toBe(3);
    expect(canGrantAccess(usage)).toBe(true);
  });
});

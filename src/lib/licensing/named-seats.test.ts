import { describe, expect, it } from 'vitest';
import { countNamedSeats, evaluateNamedSeatGrant, type ContractSeatGrant, type ContractSeatPolicy } from './named-seats';

const policy: ContractSeatPolicy = {
  contractId: 'contract-a', licenseLimit: 2,
  allowedProductIds: ['commander', 'clinic'],
  allowedCompanyIds: ['company-a', 'company-b'],
};
const maria: ContractSeatGrant = {
  contractId: 'contract-a', identityId: 'maria',
  productId: 'commander', companyId: 'company-a',
  installationId: 'shared-1', roleId: 'admin', status: 'ACTIVE',
};
const joao: ContractSeatGrant = { ...maria, identityId: 'joao', roleId: 'reader' };

describe('contract-scoped named licensing', () => {
  it('counts each identity only once across different products and companies', () => {
    expect(countNamedSeats('contract-a', [
      maria,
      { ...maria, productId: 'clinic', companyId: 'company-b', roleId: 'reader' },
      joao,
      { ...maria, contractId: 'contract-b' },
    ])).toBe(2);
  });
  it('lets Maria access a different company and product without a second seat', () => {
    expect(evaluateNamedSeatGrant(policy, [maria, joao], {
      ...maria, productId: 'clinic', companyId: 'company-b', roleId: 'reader',
    })).toMatchObject({ allowed: true, additionalSeats: 0, occupied: 2 });
  });
  it('refuses a second role for the same user, company, product and installation', () => {
    expect(evaluateNamedSeatGrant(policy, [maria], { ...maria, roleId: 'reader' }))
      .toMatchObject({ allowed: false, reason: 'ROLE_CONFLICT' });
  });
  it('blocks a third person when all seats are occupied', () => {
    expect(evaluateNamedSeatGrant(policy, [maria, joao], { ...maria, identityId: 'ana' }))
      .toMatchObject({ allowed: false, reason: 'LIMIT_REACHED' });
  });
  it('releases revoked seats but retains suspended seats', () => {
    expect(countNamedSeats('contract-a', [
      { ...maria, status: 'REVOKED' }, { ...joao, status: 'SUSPENDED' },
    ])).toBe(1);
  });
  it('reserves seats for pending grants to prevent over-allocation', () => {
    expect(countNamedSeats('contract-a', [
      { ...maria, status: 'PENDING' }, joao,
    ])).toBe(2);
  });
  it('rejects products or companies outside the contract', () => {
    expect(evaluateNamedSeatGrant(policy, [], { ...maria, productId: 'support' }))
      .toMatchObject({ allowed: false, reason: 'OUTSIDE_CONTRACT' });
    expect(evaluateNamedSeatGrant(policy, [], { ...maria, companyId: 'other-group' }))
      .toMatchObject({ allowed: false, reason: 'OUTSIDE_CONTRACT' });
  });
  it('counts the same person independently in different contracts', () => {
    expect(countNamedSeats('contract-b', [maria, { ...maria, contractId: 'contract-b' }])).toBe(1);
  });
  it('rejects invalid seat limits', () => {
    expect(evaluateNamedSeatGrant({ ...policy, licenseLimit: -1 }, [], maria))
      .toMatchObject({ allowed: false, reason: 'INVALID_POLICY' });
  });
});

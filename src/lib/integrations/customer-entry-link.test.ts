import { describe, expect, it } from 'vitest';
import { customerProductEntryUrl } from './customer-entry-link';

const assignment = [
  { deployment_id: 'deployment-1', client_id: 'client-1', product_id: '7commander' },
];
const production = [
  {
    deployment_id: 'deployment-1',
    environment: 'PRODUCTION',
    status: 'ACTIVE',
    entry_url: 'https://cliente.example.com/login',
  },
];

describe('customerProductEntryUrl', () => {
  it('returns a production URL only for the assigned client and product', () => {
    expect(customerProductEntryUrl('client-1', '7commander', assignment, production)).toBe(
      'https://cliente.example.com/login',
    );
    expect(customerProductEntryUrl('client-2', '7commander', assignment, production)).toBeNull();
    expect(customerProductEntryUrl('client-1', '7clinic', assignment, production)).toBeNull();
  });
  it('does not expose development, retired, http or ambiguous URLs', () => {
    expect(
      customerProductEntryUrl('client-1', '7commander', assignment, [
        { ...production[0], environment: 'DEVELOPMENT' },
      ]),
    ).toBeNull();
    expect(
      customerProductEntryUrl('client-1', '7commander', assignment, [
        { ...production[0], status: 'RETIRED' },
      ]),
    ).toBeNull();
    expect(
      customerProductEntryUrl('client-1', '7commander', assignment, [
        { ...production[0], entry_url: 'http://unsafe.example.com/' },
      ]),
    ).toBeNull();
    expect(
      customerProductEntryUrl('client-1', '7commander', assignment, [
        production[0],
        { ...production[0], entry_url: 'https://another.example.com/' },
      ]),
    ).toBeNull();
  });
});

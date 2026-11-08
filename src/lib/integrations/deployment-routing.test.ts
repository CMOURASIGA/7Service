import { describe, expect, it } from 'vitest';
import { resolveInstallation, type InstallationBinding } from './deployment-routing';

const binding: InstallationBinding = {
  clientId: 'group-a', productId: 'commander', deploymentId: 'shared',
  environmentId: 'production-shared', environment: 'PRODUCTION', status: 'ACTIVE',
};
describe('7Service installation routing', () => {
  it('resolves the exact client, product and environment', () => {
    expect(resolveInstallation('group-a', 'commander', 'PRODUCTION', [binding]))
      .toEqual({ ok: true, installation: binding });
  });
  it('rejects another client even with the same product and database', () => {
    expect(resolveInstallation('group-b', 'commander', 'PRODUCTION', [binding]))
      .toEqual({ ok: false, reason: 'NO_ACTIVE_INSTALLATION' });
  });
  it('rejects non-production and suspended installations', () => {
    expect(resolveInstallation('group-a', 'commander', 'DEVELOPMENT', [binding]).ok).toBe(false);
    expect(resolveInstallation('group-a', 'commander', 'PRODUCTION',
      [{ ...binding, status: 'SUSPENDED' }]).ok).toBe(false);
  });
  it('fails closed on ambiguous routes rather than selecting first', () => {
    expect(resolveInstallation('group-a', 'commander', 'PRODUCTION', [
      binding, { ...binding, deploymentId: 'dedicated', environmentId: 'prod-dedicated' },
    ])).toEqual({ ok: false, reason: 'AMBIGUOUS_INSTALLATION' });
  });
  it('allows two companies in a shared installation only with explicit bindings', () => {
    const second = { ...binding, clientId: 'group-b' };
    expect(resolveInstallation('group-b', 'commander', 'PRODUCTION', [binding, second]))
      .toEqual({ ok: true, installation: second });
  });
});

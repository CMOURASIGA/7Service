import { describe, expect, it } from 'vitest';
import { assertEnvironmentStatusTransition } from './status';
describe('environment lifecycle', () => {
  it('allows suspension and resumption', () => {
    expect(() => assertEnvironmentStatusTransition('ACTIVE', 'SUSPENDED')).not.toThrow();
    expect(() => assertEnvironmentStatusTransition('SUSPENDED', 'ACTIVE')).not.toThrow();
  });
  it('rejects reinstatement of retired environments', () => {
    expect(() => assertEnvironmentStatusTransition('RETIRED', 'ACTIVE')).toThrow();
    expect(() => assertEnvironmentStatusTransition('RETIRED', 'SUSPENDED')).toThrow();
  });
});

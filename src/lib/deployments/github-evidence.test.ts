import { describe, expect, it } from 'vitest';
import { matchesGithubDeploymentRun } from './github-evidence';

describe('GitHub deployment verification link', () => {
  const repo = 'CMOURASIGA/7Service';
  const run = '40744067548';
  const expected = `https://github.com/${repo}/actions/runs/${run}`;

  it('accepts only the exact workflow run URL linked by a deployment status', () => {
    expect(matchesGithubDeploymentRun(repo, run, expected)).toBe(true);
  });
  it('rejects a different successful workflow run on the same SHA', () => {
    expect(
      matchesGithubDeploymentRun(repo, run, `https://github.com/${repo}/actions/runs/40744067549`),
    ).toBe(false);
  });
  it('rejects missing, external and ambiguous links', () => {
    expect(matchesGithubDeploymentRun(repo, run, null)).toBe(false);
    expect(
      matchesGithubDeploymentRun(repo, run, 'https://other.example/actions/runs/40744067548'),
    ).toBe(false);
    expect(matchesGithubDeploymentRun(repo, run, expected + '?run=1')).toBe(false);
  });
  it('rejects malformed repositories and run IDs', () => {
    expect(matchesGithubDeploymentRun('../7Service', run, expected)).toBe(false);
    expect(matchesGithubDeploymentRun(repo, '42', expected)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { matchesVercelDeployment, type VercelDeploymentProof } from './vercel-evidence';

const proof: VercelDeploymentProof = {
  id: 'dpl_ABC123',
  projectId: 'prj_ABC123',
  readyState: 'READY',
  target: 'production',
  url: 'app.consultservices.com.br',
  meta: { githubCommitSha: 'a'.repeat(40) },
};
const input = {
  deployment: proof,
  deploymentId: 'dpl_ABC123',
  projectId: 'prj_ABC123',
  commitSha: 'a'.repeat(40),
  environment: 'PRODUCTION',
  entryUrl: 'https://app.consultservices.com.br',
};
describe('strict Vercel deployment proof', () => {
  it('accepts exact deployment, project, SHA and HTTPS host', () => {
    expect(matchesVercelDeployment(input)).toBe(true);
  });
  it('rejects another project or deployment', () => {
    expect(matchesVercelDeployment({ ...input, projectId: 'prj_OTHER' })).toBe(false);
    expect(matchesVercelDeployment({ ...input, deploymentId: 'dpl_OTHER' })).toBe(false);
  });
  it('rejects mismatched SHA, target and incomplete state', () => {
    expect(matchesVercelDeployment({ ...input, commitSha: 'b'.repeat(40) })).toBe(false);
    expect(matchesVercelDeployment({ ...input, environment: 'HOMOLOGATION' })).toBe(false);
    expect(
      matchesVercelDeployment({ ...input, deployment: { ...proof, readyState: 'BUILDING' } }),
    ).toBe(false);
  });
  it('rejects host impersonation, insecure URL and ambiguous ports', () => {
    expect(
      matchesVercelDeployment({
        ...input,
        entryUrl: 'https://app.consultservices.com.br.evil.test',
      }),
    ).toBe(false);
    expect(
      matchesVercelDeployment({ ...input, entryUrl: 'http://app.consultservices.com.br' }),
    ).toBe(false);
    expect(
      matchesVercelDeployment({ ...input, entryUrl: 'https://app.consultservices.com.br:444' }),
    ).toBe(false);
  });
});

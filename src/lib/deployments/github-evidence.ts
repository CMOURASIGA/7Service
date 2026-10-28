/**
 * GitHub deployments are not necessarily produced by the successful Actions
 * run found for the same commit. Only trust a deployment status that directly
 * identifies the exact workflow run being verified.
 */
export function matchesGithubDeploymentRun(
  repo: string,
  runId: string,
  logUrl: string | null | undefined,
): boolean {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) return false;
  if (!/^[1-9][0-9]{4,19}$/.test(runId)) return false;
  return logUrl === `https://github.com/${repo}/actions/runs/${runId}`;
}

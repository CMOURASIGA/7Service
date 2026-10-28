export type VercelDeploymentProof = {
  id?: string;
  projectId?: string;
  readyState?: string;
  target?: string | null;
  url?: string;
  alias?: string[];
  meta?: { githubCommitSha?: string };
};

/** Returns false on incomplete or ambiguous provider evidence. */
export function matchesVercelDeployment(input: {
  deployment: VercelDeploymentProof;
  deploymentId: string;
  projectId: string;
  commitSha: string;
  environment: string;
  entryUrl: string;
}): boolean {
  const { deployment: d, deploymentId, projectId, commitSha, environment, entryUrl } = input;
  if (d.id !== deploymentId || d.projectId !== projectId || d.readyState !== 'READY') return false;
  if (d.meta?.githubCommitSha?.toLowerCase() !== commitSha.toLowerCase()) return false;
  if (environment === 'PRODUCTION' ? d.target !== 'production' : d.target === 'production') return false;
  let host: string;
  try {
    const url = new URL(entryUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    host = url.hostname.toLowerCase();
  } catch {
    return false;
  }
  const hosts = [d.url, ...(d.alias ?? [])].filter((x): x is string => typeof x === 'string')
    .map((x) => x.toLowerCase());
  return hosts.includes(host);
}

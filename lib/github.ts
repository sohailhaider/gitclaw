import { Octokit } from '@octokit/rest';
import { getSetting } from './db';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export function getGitHubConfig(): GitHubConfig | null {
  const token = getSetting('github_token');
  const owner = getSetting('github_owner');
  const repo = getSetting('github_repo');
  if (!token || !owner || !repo) return null;
  return { token, owner, repo };
}

export function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

// ─── Workflow helpers ─────────────────────────────────────────────────────────

export function buildWorkflowYaml(params: {
  name: string;
  schedule: string;
  command: string;
  runsOn: string;
  jobType?: 'shell' | 'node' | 'python';
}): string {
  const { name, schedule, command, runsOn, jobType = 'shell' } = params;
  const escapedName = name.replace(/"/g, '\\"');

  // Indent command lines to 10 spaces (matches YAML block scalar stripping)
  const commandLines = command
    .split('\n')
    .map((l) => `          ${l}`)
    .join('\n');

  const header = `name: "${escapedName}"

on:
  schedule:
    - cron: "${schedule}"
  workflow_dispatch:

jobs:
  run-job:
    runs-on: ${runsOn}
    steps:
      - uses: actions/checkout@v4
`;

  if (jobType === 'node') {
    return header + `
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run Node.js script
        run: |
          node - << 'GITCLAW_SCRIPT_EOF'
${commandLines}
          GITCLAW_SCRIPT_EOF
`;
  }

  if (jobType === 'python') {
    return header + `
      - uses: actions/setup-python@v4
        with:
          python-version: '3.x'

      - name: Run Python script
        run: |
          python3 - << 'GITCLAW_SCRIPT_EOF'
${commandLines}
          GITCLAW_SCRIPT_EOF
`;
  }

  // shell (default)
  return header + `
      - name: Run shell script
        run: |
${commandLines}
`;
}

export function workflowFileName(jobId: string): string {
  return `.github/workflows/scheduled-${jobId}.yml`;
}

// ─── GitHub Actions API ───────────────────────────────────────────────────────

export async function upsertWorkflowFile(
  config: GitHubConfig,
  filePath: string,
  content: string,
  message: string
): Promise<void> {
  const octokit = createOctokit(config.token);
  const encoded = Buffer.from(content).toString('base64');

  // Check if file exists to get SHA for update
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: filePath,
    });
    if (!Array.isArray(data) && 'sha' in data) {
      sha = data.sha;
    }
  } catch {
    // File doesn't exist yet — that's fine
  }

  await octokit.repos.createOrUpdateFileContents({
    owner: config.owner,
    repo: config.repo,
    path: filePath,
    message,
    content: encoded,
    ...(sha ? { sha } : {}),
  });
}

export async function deleteWorkflowFile(
  config: GitHubConfig,
  filePath: string
): Promise<void> {
  const octokit = createOctokit(config.token);
  try {
    const { data } = await octokit.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: filePath,
    });
    if (!Array.isArray(data) && 'sha' in data) {
      await octokit.repos.deleteFile({
        owner: config.owner,
        repo: config.repo,
        path: filePath,
        message: `ci: remove scheduled job workflow ${filePath}`,
        sha: data.sha,
      });
    }
  } catch {
    // Already gone — ignore
  }
}

export async function triggerWorkflowDispatch(
  config: GitHubConfig,
  workflowFile: string
): Promise<void> {
  const octokit = createOctokit(config.token);
  // Get default branch
  const { data: repoData } = await octokit.repos.get({
    owner: config.owner,
    repo: config.repo,
  });
  const ref = repoData.default_branch;

  await octokit.actions.createWorkflowDispatch({
    owner: config.owner,
    repo: config.repo,
    workflow_id: workflowFile,
    ref,
  });
}

export async function listWorkflowRuns(
  config: GitHubConfig,
  workflowFile: string,
  perPage = 5
): Promise<Array<{ id: number; status: string; conclusion: string | null; html_url: string; created_at: string }>> {
  const octokit = createOctokit(config.token);
  try {
    const { data } = await octokit.actions.listWorkflowRuns({
      owner: config.owner,
      repo: config.repo,
      workflow_id: workflowFile,
      per_page: perPage,
    });
    return data.workflow_runs.map((r) => ({
      id: r.id,
      status: r.status ?? 'unknown',
      conclusion: r.conclusion ?? null,
      html_url: r.html_url,
      created_at: r.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getWorkflowRunJobs(
  config: GitHubConfig,
  runId: number
): Promise<Array<{
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  steps: Array<{ number: number; name: string; status: string; conclusion: string | null }>;
}>> {
  const octokit = createOctokit(config.token);
  try {
    const { data } = await octokit.actions.listJobsForWorkflowRun({
      owner: config.owner,
      repo: config.repo,
      run_id: runId,
    });
    return data.jobs.map((job) => ({
      id: job.id,
      name: job.name,
      status: job.status ?? 'unknown',
      conclusion: job.conclusion ?? null,
      started_at: job.started_at ?? null,
      completed_at: job.completed_at ?? null,
      steps: (job.steps ?? []).map((step) => ({
        number: step.number,
        name: step.name,
        status: step.status ?? 'unknown',
        conclusion: step.conclusion ?? null,
      })),
    }));
  } catch {
    return [];
  }
}

export async function validateGitHubToken(
  token: string,
  owner: string,
  repo: string
): Promise<{ valid: boolean; error?: string }> {
  const octokit = createOctokit(token);
  try {
    await octokit.repos.get({ owner, repo });
    return { valid: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { valid: false, error: message };
  }
}

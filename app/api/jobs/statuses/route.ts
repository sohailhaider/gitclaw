import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listJobs } from '@/lib/db';
import { getGitHubConfig, createOctokit } from '@/lib/github';

export interface JobStatus {
  id: string;
  name: string;
  status: string | null;
  conclusion: string | null;
  created_at: string | null;
  html_url: string | null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const jobs = listJobs();
  const config = getGitHubConfig();

  // No GitHub config — return jobs with no run status
  if (!config) {
    const statuses: Record<string, JobStatus> = {};
    jobs.forEach(j => { statuses[j.id] = { id: j.id, name: j.name, status: null, conclusion: null, created_at: null, html_url: null }; });
    return NextResponse.json({ statuses });
  }

  const octokit = createOctokit(config.token);

  // Fetch latest run for each job in parallel; ignore individual failures
  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      if (!job.workflow_file) {
        return { id: job.id, name: job.name, status: null, conclusion: null, created_at: null, html_url: null };
      }
      const { data } = await octokit.actions.listWorkflowRuns({
        owner: config.owner,
        repo: config.repo,
        workflow_id: job.workflow_file,
        per_page: 1,
      });
      const run = data.workflow_runs[0];
      return {
        id: job.id,
        name: job.name,
        status: run?.status ?? null,
        conclusion: run?.conclusion ?? null,
        created_at: run?.created_at ?? null,
        html_url: run?.html_url ?? null,
      };
    })
  );

  const statuses: Record<string, JobStatus> = {};
  results.forEach((result, i) => {
    const job = jobs[i];
    if (result.status === 'fulfilled') {
      statuses[job.id] = result.value;
    } else {
      statuses[job.id] = { id: job.id, name: job.name, status: null, conclusion: null, created_at: null, html_url: null };
    }
  });

  return NextResponse.json({ statuses });
}

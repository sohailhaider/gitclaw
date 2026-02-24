import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getJob, getRunHistory } from '@/lib/db';
import { getGitHubConfig, listWorkflowRuns, getWorkflowRunJobs } from '@/lib/github';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const localHistory = getRunHistory(id);
  const config = getGitHubConfig();

  let githubRuns: Awaited<ReturnType<typeof listWorkflowRuns>> = [];
  if (config && job.workflow_file) {
    githubRuns = await listWorkflowRuns(config, job.workflow_file, 10);
  }

  // Enrich each run with step-level job data (fetch in parallel)
  const enriched = await Promise.all(
    githubRuns.map(async (run) => {
      const jobs = config ? await getWorkflowRunJobs(config, run.id) : [];
      return { ...run, jobs };
    })
  );

  return NextResponse.json({ localHistory, githubRuns: enriched });
}

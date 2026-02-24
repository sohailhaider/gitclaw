import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getJob, updateJob, addRunRecord } from '@/lib/db';
import { getGitHubConfig, triggerWorkflowDispatch } from '@/lib/github';
import { generateId } from '@/lib/utils';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!job.workflow_file) return NextResponse.json({ error: 'No workflow file' }, { status: 400 });

  const config = getGitHubConfig();
  if (!config) return NextResponse.json({ error: 'GitHub not configured' }, { status: 500 });

  await triggerWorkflowDispatch(config, job.workflow_file);

  const now = new Date().toISOString();
  const runId = generateId();

  addRunRecord({
    id: runId,
    job_id: id,
    triggered: now,
    status: 'triggered',
    run_id: null,
    run_url: `https://github.com/${config.owner}/${config.repo}/actions`,
  });

  updateJob(id, { last_triggered: now });

  return NextResponse.json({ ok: true, run_url: `https://github.com/${config.owner}/${config.repo}/actions` });
}

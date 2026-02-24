import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listJobs, createJob } from '@/lib/db';
import { getGitHubConfig, buildWorkflowYaml, workflowFileName, upsertWorkflowFile } from '@/lib/github';
import { generateId } from '@/lib/utils';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const jobs = listJobs();
  return NextResponse.json({ jobs });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, description, schedule, command, runsOn = 'ubuntu-latest' } = body as {
    name: string;
    description?: string;
    schedule: string;
    command: string;
    runsOn?: string;
  };

  if (!name || !schedule || !command) {
    return NextResponse.json({ error: 'name, schedule, and command are required' }, { status: 400 });
  }

  const config = getGitHubConfig();
  if (!config) {
    return NextResponse.json({ error: 'GitHub not configured' }, { status: 500 });
  }

  const id = generateId();
  const workflowYaml = buildWorkflowYaml({ name, schedule, command, runsOn });
  const filePath = workflowFileName(id);

  // Push workflow to GitHub
  await upsertWorkflowFile(
    config,
    filePath,
    workflowYaml,
    `ci: add scheduled job "${name}" [${id}]`
  );

  const job = createJob({
    id,
    name,
    description: description ?? '',
    schedule,
    command,
    workflow_yaml: workflowYaml,
    runs_on: runsOn,
    enabled: 1,
    last_triggered: null,
    workflow_file: filePath,
  });

  return NextResponse.json({ job }, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getJob, updateJob, deleteJob } from '@/lib/db';
import {
  getGitHubConfig,
  buildWorkflowYaml,
  upsertWorkflowFile,
  deleteWorkflowFile,
} from '@/lib/github';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ job });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const { name, description, schedule, command, runsOn, enabled } = body as {
    name?: string;
    description?: string;
    schedule?: string;
    command?: string;
    runsOn?: string;
    enabled?: boolean;
  };

  const newName = name ?? job.name;
  const newSchedule = schedule ?? job.schedule;
  const newCommand = command ?? job.command;
  const newRunsOn = runsOn ?? job.runs_on;

  const workflowYaml = buildWorkflowYaml({
    name: newName,
    schedule: newSchedule,
    command: newCommand,
    runsOn: newRunsOn,
  });

  const config = getGitHubConfig();
  if (config && job.workflow_file) {
    await upsertWorkflowFile(
      config,
      job.workflow_file,
      workflowYaml,
      `ci: update scheduled job "${newName}" [${id}]`
    );
  }

  const updated = updateJob(id, {
    name: newName,
    description: description ?? job.description,
    schedule: newSchedule,
    command: newCommand,
    workflow_yaml: workflowYaml,
    runs_on: newRunsOn,
    enabled: enabled !== undefined ? (enabled ? 1 : 0) : job.enabled,
  });

  return NextResponse.json({ job: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const config = getGitHubConfig();
  if (config && job.workflow_file) {
    await deleteWorkflowFile(config, job.workflow_file);
  }

  deleteJob(id);
  return NextResponse.json({ ok: true });
}

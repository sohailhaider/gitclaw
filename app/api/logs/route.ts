import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSetting } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const jobRunId = req.nextUrl.searchParams.get('jobRunId');
  if (!jobRunId) return NextResponse.json({ error: 'jobRunId required' }, { status: 400 });

  const token = getSetting('github_token');
  const owner = getSetting('github_owner');
  const repo = getSetting('github_repo');
  if (!token || !owner || !repo) {
    return NextResponse.json({ error: 'GitHub not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${jobRunId}/logs`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        redirect: 'follow',
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: `GitHub returned ${response.status}` }, { status: response.status });
    }

    const text = await response.text();
    return new NextResponse(text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

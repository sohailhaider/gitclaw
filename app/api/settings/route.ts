import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSetting, setSetting } from '@/lib/db';
import { validateGitHubToken } from '@/lib/github';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    githubOwner: getSetting('github_owner') ?? '',
    githubRepo: getSetting('github_repo') ?? '',
    // Never return the token — just whether it's set
    githubTokenSet: !!getSetting('github_token'),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { githubToken, githubOwner, githubRepo } = body as Record<string, string>;

  if (!githubToken || !githubOwner || !githubRepo) {
    return NextResponse.json({ error: 'All GitHub fields are required' }, { status: 400 });
  }

  const ghResult = await validateGitHubToken(githubToken, githubOwner, githubRepo);
  if (!ghResult.valid) {
    return NextResponse.json(
      { error: `GitHub validation failed: ${ghResult.error}` },
      { status: 400 }
    );
  }

  setSetting('github_token', githubToken);
  setSetting('github_owner', githubOwner);
  setSetting('github_repo', githubRepo);

  return NextResponse.json({ ok: true });
}

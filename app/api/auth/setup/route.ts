import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSetting, setSetting } from '@/lib/db';
import { setSessionCookie } from '@/lib/auth';
import { validateGitHubToken } from '@/lib/github';

export async function POST(request: NextRequest) {
  // Block if already set up
  const existing = getSetting('admin_password_hash');
  if (existing) {
    return NextResponse.json({ error: 'Already configured' }, { status: 409 });
  }

  const body = await request.json();
  const { password, githubToken, githubOwner, githubRepo } = body as Record<string, string>;

  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!githubToken || !githubOwner || !githubRepo) {
    return NextResponse.json({ error: 'GitHub token, owner, and repo are required' }, { status: 400 });
  }

  // Validate GitHub credentials
  const ghResult = await validateGitHubToken(githubToken, githubOwner, githubRepo);
  if (!ghResult.valid) {
    return NextResponse.json(
      { error: `GitHub validation failed: ${ghResult.error}` },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(password, 12);
  setSetting('admin_password_hash', hash);
  setSetting('github_token', githubToken);
  setSetting('github_owner', githubOwner);
  setSetting('github_repo', githubRepo);

  const response = NextResponse.json({ ok: true });
  return setSessionCookie(response, { admin: true });
}

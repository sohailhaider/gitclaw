import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/db';

export async function GET() {
  const hasAdmin = !!getSetting('admin_password_hash');
  const hasGitHub = !!(
    getSetting('github_token') &&
    getSetting('github_owner') &&
    getSetting('github_repo')
  );

  return NextResponse.json({ configured: hasAdmin && hasGitHub, hasAdmin, hasGitHub });
}

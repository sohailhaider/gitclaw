import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSetting } from '@/lib/db';
import { setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body as { password: string };

  const hash = getSetting('admin_password_hash');
  if (!hash) {
    return NextResponse.json({ error: 'Not configured yet' }, { status: 400 });
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  return setSessionCookie(response, { admin: true });
}

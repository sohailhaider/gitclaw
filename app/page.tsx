import { redirect } from 'next/navigation';
import { getSetting } from '@/lib/db';
import { getSession } from '@/lib/auth';

export default async function RootPage() {
  const hasAdmin = !!getSetting('admin_password_hash');
  if (!hasAdmin) redirect('/setup');

  const session = await getSession();
  if (!session) redirect('/login');

  redirect('/dashboard');
}

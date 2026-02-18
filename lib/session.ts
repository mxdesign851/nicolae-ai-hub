import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function requireUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user && 'id' in session.user ? (session.user.id as string) : session?.user?.email;
  if (!userId) throw new Error('Unauthorized');
  return { session, userId };
}

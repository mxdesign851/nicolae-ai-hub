import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    redirect('/sign-in');
  }

  return { session, user };
}

export async function requireApiUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }
  return prisma.user.findUnique({ where: { id: userId } });
}

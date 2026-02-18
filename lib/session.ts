import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function requireUser() {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch {
    redirect('/sign-in');
  }

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  let user = null;
  try {
    user = await prisma.user.findUnique({ where: { id: session.user.id } });
  } catch {
    redirect('/sign-in');
  }

  if (!user) {
    redirect('/sign-in');
  }

  return { session, user };
}

export async function requireApiUser() {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    return null;
  }

  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  try {
    return await prisma.user.findUnique({ where: { id: userId } });
  } catch {
    return null;
  }
}

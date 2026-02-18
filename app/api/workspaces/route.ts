import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PLAN_LIMITS } from '@/lib/plans';

const schema = z.object({ name: z.string().min(2), userId: z.string().min(1) });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const userWorkspaceCount = await prisma.workspaceMembership.count({ where: { userId: parsed.data.userId } });
  if (userWorkspaceCount >= PLAN_LIMITS.FREE.maxWorkspaces) {
    return NextResponse.json({ error: 'Free plan supports only 1 workspace' }, { status: 403 });
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.data.name,
      memberships: { create: { userId: parsed.data.userId, role: Role.OWNER } }
    }
  });

  return NextResponse.json(workspace);
}

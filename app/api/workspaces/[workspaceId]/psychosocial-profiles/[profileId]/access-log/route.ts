import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { jsonError, HttpError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { assertWorkspaceAccess } from '@/lib/tenant';

type Params = { params: { workspaceId: string; profileId: string } };

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN]);

    const profile = await prisma.psychosocialProfile.findFirst({
      where: { id: params.profileId, workspaceId: params.workspaceId }
    });
    if (!profile) {
      throw new HttpError(404, 'Profilul nu a fost gasit');
    }

    const logs = await prisma.profileAccessLog.findMany({
      where: { profileId: params.profileId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        actor: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        actor: log.actor,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString()
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}

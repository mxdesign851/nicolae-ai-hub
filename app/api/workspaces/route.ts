import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertWorkspaceLimit } from '@/lib/tenant';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { jsonError } from '@/lib/http';
import { sanitizeText } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';

const schema = z.object({
  name: z.string().min(2).max(80)
});

export async function GET() {
  try {
    const user = await requireApiUserOrThrow();
    const memberships = await prisma.workspaceMembership.findMany({
      where: { userId: user.id },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                locations: true,
                reviews: true,
                memberships: true
              }
            }
          }
        }
      },
      orderBy: { joinedAt: 'asc' }
    });

    return NextResponse.json({
      workspaces: memberships.map((membership) => ({
        workspaceId: membership.workspaceId,
        role: membership.role,
        joinedAt: membership.joinedAt,
        workspace: membership.workspace
      }))
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUserOrThrow();
    const body = await request.json();
    const parsed = schema.parse(body);

    await assertWorkspaceLimit(user.id);
    const safeName = sanitizeText(parsed.name, 80);

    const workspace = await prisma.workspace.create({
      data: {
        name: safeName,
        memberships: { create: { userId: user.id, role: Role.OWNER } },
        sources: {
          createMany: {
            data: [
              { provider: 'GOOGLE', displayName: 'Google Reviews', status: 'MANUAL' },
              { provider: 'FACEBOOK', displayName: 'Facebook Reviews', status: 'MANUAL' },
              { provider: 'YELP', displayName: 'Yelp Reviews', status: 'MANUAL' },
              { provider: 'TRUSTPILOT', displayName: 'Trustpilot Reviews', status: 'MANUAL' }
            ]
          }
        }
      }
    });

    await logAudit({
      workspaceId: workspace.id,
      actorId: user.id,
      action: 'MEMBER_ADDED',
      metadata: { message: 'Workspace created and owner membership assigned' }
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

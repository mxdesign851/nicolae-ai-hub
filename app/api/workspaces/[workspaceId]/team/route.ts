import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { assertTeamLimit, assertWorkspaceAccess } from '@/lib/tenant';
import { HttpError, jsonError } from '@/lib/http';
import { sanitizeEmail, sanitizeText } from '@/lib/sanitize';
import { logAudit } from '@/lib/audit';

const createMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).optional(),
  role: z.nativeEnum(Role).default(Role.MEMBER)
});

const updateRoleSchema = z.object({
  membershipId: z.string().min(1),
  role: z.nativeEnum(Role)
});

type Params = { params: { workspaceId: string } };

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);
    const memberships = await prisma.workspaceMembership.findMany({
      where: { workspaceId: params.workspaceId },
      include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }]
    });
    return NextResponse.json({ members: memberships });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const actor = await requireApiUserOrThrow();
    const actorMembership = await assertWorkspaceAccess(actor.id, params.workspaceId, [Role.OWNER, Role.ADMIN]);
    const body = await request.json();
    const parsed = createMemberSchema.parse(body);
    const email = sanitizeEmail(parsed.email);

    const existingMembership = await prisma.workspaceMembership.findFirst({
      where: { workspaceId: params.workspaceId, user: { email } }
    });
    if (existingMembership) {
      throw new HttpError(409, 'User is already in this workspace');
    }

    await assertTeamLimit(params.workspaceId);

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const randomPassword = await bcrypt.hash(randomUUID(), 10);
      user = await prisma.user.create({
        data: {
          email,
          name: parsed.name ? sanitizeText(parsed.name, 100) : null,
          hashedPassword: randomPassword
        }
      });
    }

    const membership = await prisma.workspaceMembership.create({
      data: {
        workspaceId: params.workspaceId,
        userId: user.id,
        role: actorMembership.workspace.plan === 'AGENCY' ? parsed.role : Role.MEMBER
      },
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    await logAudit({
      workspaceId: params.workspaceId,
      actorId: actor.id,
      action: 'MEMBER_ADDED',
      metadata: { targetEmail: email, role: membership.role }
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const actor = await requireApiUserOrThrow();
    await assertWorkspaceAccess(actor.id, params.workspaceId, [Role.OWNER, Role.ADMIN]);
    const body = await request.json();
    const parsed = updateRoleSchema.parse(body);

    const membership = await prisma.workspaceMembership.findUnique({
      where: { id: parsed.membershipId }
    });
    if (!membership || membership.workspaceId !== params.workspaceId) {
      throw new HttpError(404, 'Membership not found');
    }

    if (membership.role === 'OWNER' && parsed.role !== 'OWNER') {
      const ownerCount = await prisma.workspaceMembership.count({
        where: { workspaceId: params.workspaceId, role: 'OWNER' }
      });
      if (ownerCount <= 1) {
        throw new HttpError(400, 'Workspace must keep at least one OWNER');
      }
    }

    const updated = await prisma.workspaceMembership.update({
      where: { id: parsed.membershipId },
      data: { role: parsed.role }
    });

    await logAudit({
      workspaceId: params.workspaceId,
      actorId: actor.id,
      action: 'MEMBER_ROLE_UPDATED',
      metadata: { membershipId: parsed.membershipId, role: parsed.role }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const actor = await requireApiUserOrThrow();
    const actorMembership = await assertWorkspaceAccess(actor.id, params.workspaceId, [Role.OWNER, Role.ADMIN]);
    const url = new URL(request.url);
    const membershipId = url.searchParams.get('membershipId');

    if (!membershipId) throw new HttpError(400, 'membershipId query parameter is required');
    const membership = await prisma.workspaceMembership.findUnique({ where: { id: membershipId } });
    if (!membership || membership.workspaceId !== params.workspaceId) {
      throw new HttpError(404, 'Membership not found');
    }

    if (membership.role === 'OWNER' && actorMembership.role !== 'OWNER') {
      throw new HttpError(403, 'Only owner can remove owner memberships');
    }
    if (membership.role === 'OWNER') {
      const ownerCount = await prisma.workspaceMembership.count({
        where: { workspaceId: params.workspaceId, role: 'OWNER' }
      });
      if (ownerCount <= 1) {
        throw new HttpError(400, 'Workspace must keep at least one OWNER');
      }
    }

    await prisma.workspaceMembership.delete({ where: { id: membershipId } });
    await logAudit({
      workspaceId: params.workspaceId,
      actorId: actor.id,
      action: 'MEMBER_REMOVED',
      metadata: { membershipId }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

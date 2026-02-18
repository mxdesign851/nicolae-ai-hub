import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { jsonError, HttpError } from '@/lib/http';
import { normalizePhoneNumber } from '@/lib/phone';
import { prisma } from '@/lib/prisma';
import { assertWorkspaceAccess } from '@/lib/tenant';

type Params = { params: { workspaceId: string } };

const updatePreferenceSchema = z.object({
  phoneNumber: z.string().max(32).nullable().optional(),
  enablePhoneAlerts: z.boolean().optional(),
  enableLowStockAlerts: z.boolean().optional(),
  enableExpiryAlerts: z.boolean().optional(),
  expiryAlertDays: z.coerce.number().int().min(1).max(180).optional()
});

function normalizePhone(value: string | null | undefined) {
  return normalizePhoneNumber(value);
}

export async function GET(_: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN, Role.MEMBER]);

    const preference = await prisma.medicationNotificationPreference.upsert({
      where: { workspaceId: params.workspaceId },
      update: {},
      create: { workspaceId: params.workspaceId }
    });

    return NextResponse.json({ preference });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireApiUserOrThrow();
    await assertWorkspaceAccess(user.id, params.workspaceId, [Role.OWNER, Role.ADMIN]);
    const parsed = updatePreferenceSchema.parse(await request.json());

    if (!Object.keys(parsed).length) {
      throw new HttpError(400, 'Nu exista campuri pentru actualizare');
    }

    const existing = await prisma.medicationNotificationPreference.upsert({
      where: { workspaceId: params.workspaceId },
      update: {},
      create: { workspaceId: params.workspaceId }
    });

    const phoneNumber = parsed.phoneNumber !== undefined ? normalizePhone(parsed.phoneNumber) : existing.phoneNumber;
    const enablePhoneAlerts = parsed.enablePhoneAlerts ?? existing.enablePhoneAlerts;

    if (enablePhoneAlerts && !phoneNumber) {
      throw new HttpError(400, 'Pentru alerte telefonice trebuie introdus un numar de telefon');
    }

    const preference = await prisma.medicationNotificationPreference.update({
      where: { workspaceId: params.workspaceId },
      data: {
        ...(parsed.phoneNumber !== undefined ? { phoneNumber } : {}),
        ...(parsed.enablePhoneAlerts !== undefined ? { enablePhoneAlerts: parsed.enablePhoneAlerts } : {}),
        ...(parsed.enableLowStockAlerts !== undefined ? { enableLowStockAlerts: parsed.enableLowStockAlerts } : {}),
        ...(parsed.enableExpiryAlerts !== undefined ? { enableExpiryAlerts: parsed.enableExpiryAlerts } : {}),
        ...(parsed.expiryAlertDays !== undefined ? { expiryAlertDays: parsed.expiryAlertDays } : {})
      }
    });

    return NextResponse.json({ preference });
  } catch (error) {
    return jsonError(error);
  }
}

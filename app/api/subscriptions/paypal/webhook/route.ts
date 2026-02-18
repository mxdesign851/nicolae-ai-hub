import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonError } from '@/lib/http';
import { mapPlanFromPayPalPlanId, normalizePayPalStatus, upsertSubscriptionAndPlan } from '@/lib/billing';

type PayPalWebhook = {
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    plan_id?: string;
    billing_info?: {
      next_billing_time?: string;
    };
  };
};

export async function POST(request: Request) {
  try {
    // TODO: Verify PayPal webhook signatures before trusting payload in production.
    const payload = (await request.json()) as PayPalWebhook;
    const subscriptionId = payload.resource?.id;
    if (!subscriptionId) return NextResponse.json({ ok: true });

    const existing = await prisma.subscription.findFirst({
      where: { externalId: subscriptionId, provider: 'PAYPAL' }
    });
    if (!existing) return NextResponse.json({ ok: true });

    const status = normalizePayPalStatus(payload.resource?.status);
    await upsertSubscriptionAndPlan({
      workspaceId: existing.workspaceId,
      provider: 'PAYPAL',
      externalId: subscriptionId,
      status,
      plan: mapPlanFromPayPalPlanId(payload.resource?.plan_id),
      currentPeriodEnd: payload.resource?.billing_info?.next_billing_time
        ? new Date(payload.resource.billing_info.next_billing_time)
        : null,
      metadata: payload
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

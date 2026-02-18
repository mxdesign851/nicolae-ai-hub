import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { HttpError, jsonError } from '@/lib/http';
import { mapPlanFromPayPalPlanId } from '@/lib/billing';

const schema = z.object({
  workspaceId: z.string().min(1),
  planId: z.string().optional(),
  plan: z.enum(['PRO', 'AGENCY']).optional()
});

async function createPayPalSubscription(planId: string) {
  const base = process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new HttpError(500, 'Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET');
  }

  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new HttpError(tokenRes.status, 'PayPal token request failed', text);
  }
  const tokenJson = await tokenRes.json();

  const subRes = await fetch(`${base}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      plan_id: planId,
      application_context: {
        return_url: `${process.env.APP_URL}/billing?paypal=success`,
        cancel_url: `${process.env.APP_URL}/billing?paypal=cancel`
      }
    })
  });
  if (!subRes.ok) {
    const text = await subRes.text();
    throw new HttpError(subRes.status, 'PayPal subscription create failed', text);
  }
  return subRes.json() as Promise<{ id: string; status: string; links?: Array<{ rel: string; href: string }>; plan_id?: string }>;
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUserOrThrow();
    const body = await request.json();
    const parsed = schema.parse(body);
    await assertWorkspaceAccess(user.id, parsed.workspaceId, [Role.OWNER, Role.ADMIN]);

    const fallbackPlanId = parsed.plan === 'AGENCY' ? process.env.PAYPAL_PLAN_AGENCY : process.env.PAYPAL_PLAN_PRO;
    const planId = parsed.planId ?? fallbackPlanId;
    if (!planId) {
      throw new HttpError(400, 'Missing PayPal plan id. Provide planId or PAYPAL_PLAN_PRO/PAYPAL_PLAN_AGENCY env.');
    }

    const subscription = await createPayPalSubscription(planId);
    await prisma.subscription.upsert({
      where: { workspaceId: parsed.workspaceId },
      create: {
        workspaceId: parsed.workspaceId,
        provider: 'PAYPAL',
        externalId: subscription.id,
        status: 'APPROVAL_PENDING',
        plan: mapPlanFromPayPalPlanId(subscription.plan_id ?? planId),
        metadata: {
          planId: subscription.plan_id ?? planId
        }
      },
      update: {
        provider: 'PAYPAL',
        externalId: subscription.id,
        status: 'APPROVAL_PENDING',
        plan: mapPlanFromPayPalPlanId(subscription.plan_id ?? planId),
        metadata: {
          planId: subscription.plan_id ?? planId
        }
      }
    });

    const approve = subscription.links?.find((link) => link.rel === 'approve')?.href;
    return NextResponse.json({ approvalUrl: approve, subscriptionId: subscription.id });
  } catch (error) {
    return jsonError(error);
  }
}

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireApiUserOrThrow } from '@/lib/api-auth';
import { assertWorkspaceAccess } from '@/lib/tenant';
import { HttpError, jsonError } from '@/lib/http';
import { mapPlanFromStripePriceId } from '@/lib/billing';

const schema = z.object({
  workspaceId: z.string().min(1),
  action: z.enum(['checkout', 'portal']).default('checkout'),
  priceId: z.string().optional(),
  plan: z.enum(['PRO', 'AGENCY']).optional()
});

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new HttpError(500, 'Missing STRIPE_SECRET_KEY');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUserOrThrow();
    const body = await request.json();
    const parsed = schema.parse(body);
    await assertWorkspaceAccess(user.id, parsed.workspaceId, [Role.OWNER, Role.ADMIN]);

    const stripe = getStripe();
    if (parsed.action === 'portal') {
      const existing = await prisma.subscription.findUnique({ where: { workspaceId: parsed.workspaceId } });
      const customerId = existing?.metadata && typeof existing.metadata === 'object' ? (existing.metadata as { customerId?: string }).customerId : undefined;
      if (!customerId) {
        throw new HttpError(400, 'No Stripe customer found for this workspace yet');
      }
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.APP_URL}/w/${parsed.workspaceId}/billing`
      });
      return NextResponse.json({ url: portal.url });
    }

    const fallbackPriceId = parsed.plan === 'AGENCY' ? process.env.STRIPE_PRICE_AGENCY : process.env.STRIPE_PRICE_PRO;
    const priceId = parsed.priceId ?? fallbackPriceId;
    if (!priceId) {
      throw new HttpError(400, 'Missing Stripe price id. Provide priceId or STRIPE_PRICE_PRO/STRIPE_PRICE_AGENCY env.');
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/w/${parsed.workspaceId}/billing?success=1`,
      cancel_url: `${process.env.APP_URL}/w/${parsed.workspaceId}/billing?cancel=1`,
      metadata: {
        workspaceId: parsed.workspaceId,
        plan: mapPlanFromStripePriceId(priceId)
      }
    });

    await prisma.subscription.upsert({
      where: { workspaceId: parsed.workspaceId },
      create: {
        workspaceId: parsed.workspaceId,
        provider: 'STRIPE',
        externalId: checkout.id,
        status: 'INCOMPLETE',
        plan: mapPlanFromStripePriceId(priceId),
        metadata: { checkoutSessionId: checkout.id }
      },
      update: {
        provider: 'STRIPE',
        externalId: checkout.id,
        status: 'INCOMPLETE',
        plan: mapPlanFromStripePriceId(priceId),
        metadata: { checkoutSessionId: checkout.id }
      }
    });

    return NextResponse.json({ checkoutUrl: checkout.url, sessionId: checkout.id });
  } catch (error) {
    return jsonError(error);
  }
}

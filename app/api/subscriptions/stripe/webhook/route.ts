import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import {
  mapPlanFromStripePriceId,
  normalizeStripeStatus,
  upsertSubscriptionAndPlan,
  markSubscriptionPastDue
} from '@/lib/billing';
import { jsonError, HttpError } from '@/lib/http';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new HttpError(500, 'Missing STRIPE_SECRET_KEY');
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
}

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const signature = request.headers.get('stripe-signature');
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !secret) {
      throw new HttpError(400, 'Missing Stripe webhook signature or secret');
    }

    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(payload, signature, secret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspaceId;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
      if (!workspaceId || !subscriptionId) return NextResponse.json({ ok: true });

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price.id;
      const plan = mapPlanFromStripePriceId(priceId);

      await upsertSubscriptionAndPlan({
        workspaceId,
        provider: 'STRIPE',
        externalId: subscription.id,
        status: normalizeStripeStatus(subscription.status),
        plan,
        currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
        metadata: {
          customerId: typeof subscription.customer === 'string' ? subscription.customer : null,
          latestInvoice: typeof subscription.latest_invoice === 'string' ? subscription.latest_invoice : null
        }
      });
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const existing = await prisma.subscription.findFirst({
        where: { externalId: subscription.id, provider: 'STRIPE' }
      });
      if (existing) {
        const priceId = subscription.items.data[0]?.price.id;
        await upsertSubscriptionAndPlan({
          workspaceId: existing.workspaceId,
          provider: 'STRIPE',
          externalId: subscription.id,
          status: normalizeStripeStatus(subscription.status),
          plan: mapPlanFromStripePriceId(priceId),
          currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
          metadata: {
            customerId: typeof subscription.customer === 'string' ? subscription.customer : null
          }
        });
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null;
      if (subscriptionId) {
        const existing = await prisma.subscription.findFirst({
          where: { provider: 'STRIPE', externalId: subscriptionId }
        });
        if (existing) await markSubscriptionPastDue(existing.workspaceId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

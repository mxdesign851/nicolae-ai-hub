import { PrismaClient, Plan, ReviewSource, Role, Sentiment } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.reviewAuditLog.deleteMany();
  await prisma.replyGeneration.deleteMany();
  await prisma.review.deleteMany();
  await prisma.brandVoice.deleteMany();
  await prisma.sourceConnection.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.location.deleteMany();
  await prisma.workspaceMembership.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  const ownerPassword = await bcrypt.hash('password123', 10);
  const memberPassword = await bcrypt.hash('password123', 10);

  const owner = await prisma.user.create({
    data: {
      email: 'owner@example.com',
      name: 'Demo Owner',
      hashedPassword: ownerPassword
    }
  });

  const member = await prisma.user.create({
    data: {
      email: 'member@example.com',
      name: 'Demo Member',
      hashedPassword: memberPassword
    }
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'ReviewPilot Demo Workspace',
      plan: Plan.PRO,
      monthBucket: `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`,
      aiGenerationsUsed: 12,
      memberships: {
        create: [
          { userId: owner.id, role: Role.OWNER },
          { userId: member.id, role: Role.MEMBER }
        ]
      },
      locations: {
        create: [
          { name: 'Downtown Store', timezone: 'America/New_York' },
          { name: 'Airport Branch', timezone: 'America/Chicago' }
        ]
      },
      brandVoice: {
        create: {
          tone: 'WARM',
          doList: ['Thank the customer', 'Mention a specific detail'],
          dontList: ['Do not blame the customer', 'Avoid legal promises'],
          examples: ['Thanks for sharing your feedback - we appreciate your visit.'],
          bannedWords: ['cheap', 'fault'],
          signOff: '- The ReviewPilot Team'
        }
      },
      sources: {
        createMany: {
          data: [
            { provider: ReviewSource.GOOGLE, displayName: 'Google Reviews', status: 'MANUAL' },
            { provider: ReviewSource.FACEBOOK, displayName: 'Facebook Reviews', status: 'MANUAL' },
            { provider: ReviewSource.YELP, displayName: 'Yelp Reviews', status: 'MANUAL' },
            { provider: ReviewSource.TRUSTPILOT, displayName: 'Trustpilot Reviews', status: 'MANUAL' }
          ]
        }
      }
    },
    include: { locations: true }
  });

  await prisma.subscription.create({
    data: {
      workspaceId: workspace.id,
      provider: 'STRIPE',
      status: 'ACTIVE',
      plan: 'PRO',
      externalId: 'sub_demo_123',
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      metadata: { customerId: 'cus_demo_123' }
    }
  });

  const [downtown, airport] = workspace.locations;

  const review1 = await prisma.review.create({
    data: {
      workspaceId: workspace.id,
      locationId: downtown.id,
      source: ReviewSource.GOOGLE,
      authorName: 'Jane D.',
      rating: 2,
      text: 'Service was slow and part of the order was missing.',
      reviewDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      sentiment: Sentiment.NEG,
      tags: ['slow-service', 'order-accuracy'],
      status: 'DRAFTED',
      replyDraft: 'Thank you for your feedback and we are truly sorry for the delay and missing item...',
      draftedById: member.id,
      draftedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    }
  });

  const review2 = await prisma.review.create({
    data: {
      workspaceId: workspace.id,
      locationId: airport.id,
      source: ReviewSource.FACEBOOK,
      authorName: 'Mark R.',
      rating: 5,
      text: 'Great staff and quick support when we needed help.',
      reviewDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      sentiment: Sentiment.POS,
      tags: ['staff', 'support'],
      status: 'APPROVED',
      replyDraft: 'Thank you for the kind words! We are glad the team could help quickly.',
      approvedReply: 'Thank you for the kind words! We are glad our team could help quickly.',
      draftedById: member.id,
      draftedAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
      approvedById: owner.id,
      approvedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  });

  await prisma.replyGeneration.create({
    data: {
      workspaceId: workspace.id,
      reviewId: review1.id,
      createdById: member.id,
      provider: 'OPENAI',
      model: 'gpt-4o-mini',
      promptVersion: 'v1.0.0',
      length: 'medium',
      escalation: true,
      inputTokens: 310,
      outputTokens: 120,
      estimatedCostUsd: 0.000118,
      replyText: review1.replyDraft || ''
    }
  });

  await prisma.reviewAuditLog.createMany({
    data: [
      {
        workspaceId: workspace.id,
        reviewId: review1.id,
        actorId: member.id,
        action: 'REVIEW_DRAFTED',
        metadata: { provider: 'openai' }
      },
      {
        workspaceId: workspace.id,
        reviewId: review2.id,
        actorId: owner.id,
        action: 'REVIEW_APPROVED',
        metadata: { statusFrom: 'DRAFTED', statusTo: 'APPROVED' }
      }
    ]
  });

  // Demo credentials:
  // owner@example.com / password123
  // member@example.com / password123
  // Sign in and visit /app
  // Then open the seeded workspace dashboard.
}

main().finally(async () => prisma.$disconnect());

import { Plan, PrismaClient, ReviewSource, Role, Sentiment, Tone } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const RESET_MODE = process.env.SEED_RESET === 'true';

const IDS = {
  // Source connections (PRO workspace)
  sourceProGoogle: 'seed_source_pro_google',
  sourceProFacebook: 'seed_source_pro_facebook',
  sourceProYelp: 'seed_source_pro_yelp',
  sourceProTrustpilot: 'seed_source_pro_trustpilot',
  // Source connections (Premium workspace)
  sourcePremiumGoogle: 'seed_source_premium_google',
  sourcePremiumFacebook: 'seed_source_premium_facebook',
  sourcePremiumYelp: 'seed_source_premium_yelp',
  sourcePremiumTrustpilot: 'seed_source_premium_trustpilot',
  // Reviews
  reviewProNegative: 'seed_review_pro_neg_1',
  reviewProPositive: 'seed_review_pro_pos_1',
  reviewPremiumNegative: 'seed_review_premium_neg_1',
  reviewPremiumPositive: 'seed_review_premium_pos_1',
  // Reply generations
  generationProNegative: 'seed_generation_pro_neg_1',
  generationPremiumNegative: 'seed_generation_premium_neg_1',
  // Audit logs
  auditProDrafted: 'seed_audit_pro_drafted_1',
  auditProApproved: 'seed_audit_pro_approved_1',
  auditPremiumDrafted: 'seed_audit_premium_drafted_1',
  auditPremiumApproved: 'seed_audit_premium_approved_1'
};

function getMonthBucket(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function maybeResetAllData() {
  if (!RESET_MODE) {
    console.log('[seed] Safe mode enabled (no global delete). Set SEED_RESET=true to hard reset data.');
    return;
  }

  console.log('[seed] RESET mode enabled. Deleting all data...');
  await prisma.phoneLoginCode.deleteMany();
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
}

async function ensureWorkspace(input: {
  slug: string;
  name: string;
  plan: Plan;
  aiGenerationsUsed: number;
}) {
  const monthBucket = getMonthBucket();

  const bySlug = await prisma.workspace.findUnique({
    where: { slug: input.slug }
  });
  if (bySlug) {
    return prisma.workspace.update({
      where: { id: bySlug.id },
      data: {
        name: input.name,
        plan: input.plan,
        aiGenerationsUsed: input.aiGenerationsUsed,
        monthBucket
      }
    });
  }

  const byName = await prisma.workspace.findFirst({ where: { name: input.name } });
  if (byName) {
    return prisma.workspace.update({
      where: { id: byName.id },
      data: {
        slug: input.slug,
        plan: input.plan,
        aiGenerationsUsed: input.aiGenerationsUsed,
        monthBucket
      }
    });
  }

  return prisma.workspace.create({
    data: {
      slug: input.slug,
      name: input.name,
      plan: input.plan,
      aiGenerationsUsed: input.aiGenerationsUsed,
      monthBucket
    }
  });
}

async function ensureLocation(workspaceId: string, name: string, timezone: string) {
  return prisma.location.upsert({
    where: { workspaceId_name: { workspaceId, name } },
    update: { timezone },
    create: { workspaceId, name, timezone }
  });
}

async function ensureMembership(userId: string, workspaceId: string, role: Role) {
  return prisma.workspaceMembership.upsert({
    where: { userId_workspaceId: { userId, workspaceId } },
    update: { role },
    create: { userId, workspaceId, role }
  });
}

async function ensureSourceConnection(input: {
  id: string;
  workspaceId: string;
  provider: ReviewSource;
  displayName: string;
}) {
  return prisma.sourceConnection.upsert({
    where: { id: input.id },
    update: {
      workspaceId: input.workspaceId,
      provider: input.provider,
      displayName: input.displayName,
      status: 'MANUAL'
    },
    create: {
      id: input.id,
      workspaceId: input.workspaceId,
      provider: input.provider,
      displayName: input.displayName,
      status: 'MANUAL'
    }
  });
}

async function cleanLegacySeedSources(workspaceId: string, keepIds: string[]) {
  await prisma.sourceConnection.deleteMany({
    where: {
      workspaceId,
      status: 'MANUAL',
      id: { notIn: keepIds },
      displayName: {
        in: ['Google Reviews', 'Facebook Reviews', 'Yelp Reviews', 'Trustpilot Reviews']
      }
    }
  });
}

async function main() {
  await maybeResetAllData();

  const now = Date.now();
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {
      name: 'Demo Owner',
      hashedPassword: defaultPasswordHash,
      isSuperAdmin: false,
      phoneNumber: '+40740000001',
      phoneAuthEnabled: true,
      phoneVerifiedAt: new Date()
    },
    create: {
      email: 'owner@example.com',
      name: 'Demo Owner',
      hashedPassword: defaultPasswordHash,
      isSuperAdmin: false,
      phoneNumber: '+40740000001',
      phoneAuthEnabled: true,
      phoneVerifiedAt: new Date()
    }
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {
      name: 'Demo Member',
      hashedPassword: defaultPasswordHash,
      isSuperAdmin: false,
      phoneNumber: '+40740000002',
      phoneAuthEnabled: true,
      phoneVerifiedAt: new Date()
    },
    create: {
      email: 'member@example.com',
      name: 'Demo Member',
      hashedPassword: defaultPasswordHash,
      isSuperAdmin: false,
      phoneNumber: '+40740000002',
      phoneAuthEnabled: true,
      phoneVerifiedAt: new Date()
    }
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@reply-zen.com' },
    update: {
      name: 'Super Admin',
      hashedPassword: defaultPasswordHash,
      isSuperAdmin: true,
      phoneNumber: '+40740000003',
      phoneAuthEnabled: true,
      phoneVerifiedAt: new Date()
    },
    create: {
      email: 'superadmin@reply-zen.com',
      name: 'Super Admin',
      hashedPassword: defaultPasswordHash,
      isSuperAdmin: true,
      phoneNumber: '+40740000003',
      phoneAuthEnabled: true,
      phoneVerifiedAt: new Date()
    }
  });

  const premiumOwner = await prisma.user.upsert({
    where: { email: 'premium@reply-zen.com' },
    update: {
      name: 'Premium Demo Owner',
      hashedPassword: defaultPasswordHash,
      isSuperAdmin: false,
      phoneNumber: '+40740000004',
      phoneAuthEnabled: true,
      phoneVerifiedAt: new Date()
    },
    create: {
      email: 'premium@reply-zen.com',
      name: 'Premium Demo Owner',
      hashedPassword: defaultPasswordHash,
      isSuperAdmin: false,
      phoneNumber: '+40740000004',
      phoneAuthEnabled: true,
      phoneVerifiedAt: new Date()
    }
  });

  const premiumMember = await prisma.user.upsert({
    where: { email: 'premium-member@reply-zen.com' },
    update: {
      name: 'Premium Demo Member',
      hashedPassword: defaultPasswordHash,
      isSuperAdmin: false,
      phoneNumber: '+40740000005',
      phoneAuthEnabled: true,
      phoneVerifiedAt: new Date()
    },
    create: {
      email: 'premium-member@reply-zen.com',
      name: 'Premium Demo Member',
      hashedPassword: defaultPasswordHash,
      isSuperAdmin: false,
      phoneNumber: '+40740000005',
      phoneAuthEnabled: true,
      phoneVerifiedAt: new Date()
    }
  });

  const proWorkspace = await ensureWorkspace({
    slug: 'replyzen-demo-pro',
    name: 'ReplyZen Demo Workspace',
    plan: Plan.PRO,
    aiGenerationsUsed: 12
  });
  const premiumWorkspace = await ensureWorkspace({
    slug: 'replyzen-demo-premium',
    name: 'ReplyZen Premium Demo',
    plan: Plan.AGENCY,
    aiGenerationsUsed: 384
  });

  await Promise.all([
    ensureMembership(owner.id, proWorkspace.id, Role.OWNER),
    ensureMembership(member.id, proWorkspace.id, Role.MEMBER),
    ensureMembership(premiumOwner.id, premiumWorkspace.id, Role.OWNER),
    ensureMembership(premiumMember.id, premiumWorkspace.id, Role.MEMBER),
    ensureMembership(superAdmin.id, premiumWorkspace.id, Role.ADMIN)
  ]);

  const [downtown, airport, premiumLocationA, premiumLocationB] = await Promise.all([
    ensureLocation(proWorkspace.id, 'Downtown Store', 'America/New_York'),
    ensureLocation(proWorkspace.id, 'Airport Branch', 'America/Chicago'),
    ensureLocation(premiumWorkspace.id, 'Central City Hub', 'Europe/Bucharest'),
    ensureLocation(premiumWorkspace.id, 'North Retail Point', 'Europe/Bucharest')
  ]);
  await ensureLocation(premiumWorkspace.id, 'West Flagship', 'Europe/Bucharest');

  await Promise.all([
    prisma.brandVoice.upsert({
      where: { workspaceId: proWorkspace.id },
      update: {
        tone: Tone.WARM,
        doList: ['Thank the customer', 'Mention a specific detail'],
        dontList: ['Do not blame the customer', 'Avoid legal promises'],
        examples: ['Thanks for sharing your feedback - we appreciate your visit.'],
        bannedWords: ['cheap', 'fault'],
        signOff: '- The ReplyZen Team'
      },
      create: {
        workspaceId: proWorkspace.id,
        tone: Tone.WARM,
        doList: ['Thank the customer', 'Mention a specific detail'],
        dontList: ['Do not blame the customer', 'Avoid legal promises'],
        examples: ['Thanks for sharing your feedback - we appreciate your visit.'],
        bannedWords: ['cheap', 'fault'],
        signOff: '- The ReplyZen Team'
      }
    }),
    prisma.brandVoice.upsert({
      where: { workspaceId: premiumWorkspace.id },
      update: {
        tone: Tone.PROFESSIONAL,
        doList: ['Open with appreciation', 'Address issue directly', 'Offer a practical next step'],
        dontList: ['Do not blame customer', 'Do not overpromise'],
        examples: ['Thanks for the detailed review - we appreciate your feedback.'],
        bannedWords: ['cheap', 'fault', 'impossible'],
        signOff: '- ReplyZen Premium Team'
      },
      create: {
        workspaceId: premiumWorkspace.id,
        tone: Tone.PROFESSIONAL,
        doList: ['Open with appreciation', 'Address issue directly', 'Offer a practical next step'],
        dontList: ['Do not blame customer', 'Do not overpromise'],
        examples: ['Thanks for the detailed review - we appreciate your feedback.'],
        bannedWords: ['cheap', 'fault', 'impossible'],
        signOff: '- ReplyZen Premium Team'
      }
    })
  ]);

  await Promise.all([
    ensureSourceConnection({
      id: IDS.sourceProGoogle,
      workspaceId: proWorkspace.id,
      provider: ReviewSource.GOOGLE,
      displayName: 'Google Reviews'
    }),
    ensureSourceConnection({
      id: IDS.sourceProFacebook,
      workspaceId: proWorkspace.id,
      provider: ReviewSource.FACEBOOK,
      displayName: 'Facebook Reviews'
    }),
    ensureSourceConnection({
      id: IDS.sourceProYelp,
      workspaceId: proWorkspace.id,
      provider: ReviewSource.YELP,
      displayName: 'Yelp Reviews'
    }),
    ensureSourceConnection({
      id: IDS.sourceProTrustpilot,
      workspaceId: proWorkspace.id,
      provider: ReviewSource.TRUSTPILOT,
      displayName: 'Trustpilot Reviews'
    }),
    ensureSourceConnection({
      id: IDS.sourcePremiumGoogle,
      workspaceId: premiumWorkspace.id,
      provider: ReviewSource.GOOGLE,
      displayName: 'Google Reviews'
    }),
    ensureSourceConnection({
      id: IDS.sourcePremiumFacebook,
      workspaceId: premiumWorkspace.id,
      provider: ReviewSource.FACEBOOK,
      displayName: 'Facebook Reviews'
    }),
    ensureSourceConnection({
      id: IDS.sourcePremiumYelp,
      workspaceId: premiumWorkspace.id,
      provider: ReviewSource.YELP,
      displayName: 'Yelp Reviews'
    }),
    ensureSourceConnection({
      id: IDS.sourcePremiumTrustpilot,
      workspaceId: premiumWorkspace.id,
      provider: ReviewSource.TRUSTPILOT,
      displayName: 'Trustpilot Reviews'
    })
  ]);

  await Promise.all([
    cleanLegacySeedSources(proWorkspace.id, [
      IDS.sourceProGoogle,
      IDS.sourceProFacebook,
      IDS.sourceProYelp,
      IDS.sourceProTrustpilot
    ]),
    cleanLegacySeedSources(premiumWorkspace.id, [
      IDS.sourcePremiumGoogle,
      IDS.sourcePremiumFacebook,
      IDS.sourcePremiumYelp,
      IDS.sourcePremiumTrustpilot
    ])
  ]);

  await Promise.all([
    prisma.subscription.upsert({
      where: { workspaceId: proWorkspace.id },
      update: {
        provider: 'STRIPE',
        status: 'ACTIVE',
        plan: 'PRO',
        externalId: 'sub_demo_123',
        currentPeriodEnd: new Date(now + 14 * 24 * 60 * 60 * 1000),
        metadata: { customerId: 'cus_demo_123' }
      },
      create: {
        workspaceId: proWorkspace.id,
        provider: 'STRIPE',
        status: 'ACTIVE',
        plan: 'PRO',
        externalId: 'sub_demo_123',
        currentPeriodEnd: new Date(now + 14 * 24 * 60 * 60 * 1000),
        metadata: { customerId: 'cus_demo_123' }
      }
    }),
    prisma.subscription.upsert({
      where: { workspaceId: premiumWorkspace.id },
      update: {
        provider: 'PAYPAL',
        status: 'ACTIVE',
        plan: 'AGENCY',
        externalId: 'sub_premium_demo_456',
        currentPeriodEnd: new Date(now + 21 * 24 * 60 * 60 * 1000),
        metadata: { planId: 'agency-demo-plan' }
      },
      create: {
        workspaceId: premiumWorkspace.id,
        provider: 'PAYPAL',
        status: 'ACTIVE',
        plan: 'AGENCY',
        externalId: 'sub_premium_demo_456',
        currentPeriodEnd: new Date(now + 21 * 24 * 60 * 60 * 1000),
        metadata: { planId: 'agency-demo-plan' }
      }
    })
  ]);

  const reviewProNegative = await prisma.review.upsert({
    where: { id: IDS.reviewProNegative },
    update: {
      workspaceId: proWorkspace.id,
      locationId: downtown.id,
      source: ReviewSource.GOOGLE,
      authorName: 'Jane D.',
      rating: 2,
      text: 'Service was slow and part of the order was missing.',
      reviewDate: new Date(now - 3 * 24 * 60 * 60 * 1000),
      sentiment: Sentiment.NEG,
      tags: ['slow-service', 'order-accuracy'],
      status: 'DRAFTED',
      replyDraft: 'Thank you for your feedback and we are truly sorry for the delay and missing item...',
      draftedById: member.id,
      draftedAt: new Date(now - 2 * 24 * 60 * 60 * 1000)
    },
    create: {
      id: IDS.reviewProNegative,
      workspaceId: proWorkspace.id,
      locationId: downtown.id,
      source: ReviewSource.GOOGLE,
      authorName: 'Jane D.',
      rating: 2,
      text: 'Service was slow and part of the order was missing.',
      reviewDate: new Date(now - 3 * 24 * 60 * 60 * 1000),
      sentiment: Sentiment.NEG,
      tags: ['slow-service', 'order-accuracy'],
      status: 'DRAFTED',
      replyDraft: 'Thank you for your feedback and we are truly sorry for the delay and missing item...',
      draftedById: member.id,
      draftedAt: new Date(now - 2 * 24 * 60 * 60 * 1000)
    }
  });

  const reviewProPositive = await prisma.review.upsert({
    where: { id: IDS.reviewProPositive },
    update: {
      workspaceId: proWorkspace.id,
      locationId: airport.id,
      source: ReviewSource.FACEBOOK,
      authorName: 'Mark R.',
      rating: 5,
      text: 'Great staff and quick support when we needed help.',
      reviewDate: new Date(now - 2 * 24 * 60 * 60 * 1000),
      sentiment: Sentiment.POS,
      tags: ['staff', 'support'],
      status: 'APPROVED',
      replyDraft: 'Thank you for the kind words! We are glad the team could help quickly.',
      approvedReply: 'Thank you for the kind words! We are glad our team could help quickly.',
      draftedById: member.id,
      draftedAt: new Date(now - 36 * 60 * 60 * 1000),
      approvedById: owner.id,
      approvedAt: new Date(now - 24 * 60 * 60 * 1000)
    },
    create: {
      id: IDS.reviewProPositive,
      workspaceId: proWorkspace.id,
      locationId: airport.id,
      source: ReviewSource.FACEBOOK,
      authorName: 'Mark R.',
      rating: 5,
      text: 'Great staff and quick support when we needed help.',
      reviewDate: new Date(now - 2 * 24 * 60 * 60 * 1000),
      sentiment: Sentiment.POS,
      tags: ['staff', 'support'],
      status: 'APPROVED',
      replyDraft: 'Thank you for the kind words! We are glad the team could help quickly.',
      approvedReply: 'Thank you for the kind words! We are glad our team could help quickly.',
      draftedById: member.id,
      draftedAt: new Date(now - 36 * 60 * 60 * 1000),
      approvedById: owner.id,
      approvedAt: new Date(now - 24 * 60 * 60 * 1000)
    }
  });

  const reviewPremiumNegative = await prisma.review.upsert({
    where: { id: IDS.reviewPremiumNegative },
    update: {
      workspaceId: premiumWorkspace.id,
      locationId: premiumLocationA.id,
      source: ReviewSource.TRUSTPILOT,
      authorName: 'Cristina V.',
      rating: 1,
      text: 'Delivery was late twice and support did not answer quickly enough.',
      reviewDate: new Date(now - 1 * 24 * 60 * 60 * 1000),
      sentiment: Sentiment.NEG,
      tags: ['delivery-delay', 'support-response'],
      status: 'APPROVED',
      replyDraft:
        'Thank you for this feedback. We are sorry for the repeated delays and the slow response. Please contact our premium support line so we can resolve this immediately.',
      approvedReply:
        'Thank you for this feedback. We are sorry for the repeated delays and the slow response. Please contact our premium support line so we can resolve this immediately.',
      draftedById: premiumMember.id,
      draftedAt: new Date(now - 16 * 60 * 60 * 1000),
      approvedById: premiumOwner.id,
      approvedAt: new Date(now - 12 * 60 * 60 * 1000)
    },
    create: {
      id: IDS.reviewPremiumNegative,
      workspaceId: premiumWorkspace.id,
      locationId: premiumLocationA.id,
      source: ReviewSource.TRUSTPILOT,
      authorName: 'Cristina V.',
      rating: 1,
      text: 'Delivery was late twice and support did not answer quickly enough.',
      reviewDate: new Date(now - 1 * 24 * 60 * 60 * 1000),
      sentiment: Sentiment.NEG,
      tags: ['delivery-delay', 'support-response'],
      status: 'APPROVED',
      replyDraft:
        'Thank you for this feedback. We are sorry for the repeated delays and the slow response. Please contact our premium support line so we can resolve this immediately.',
      approvedReply:
        'Thank you for this feedback. We are sorry for the repeated delays and the slow response. Please contact our premium support line so we can resolve this immediately.',
      draftedById: premiumMember.id,
      draftedAt: new Date(now - 16 * 60 * 60 * 1000),
      approvedById: premiumOwner.id,
      approvedAt: new Date(now - 12 * 60 * 60 * 1000)
    }
  });

  await prisma.review.upsert({
    where: { id: IDS.reviewPremiumPositive },
    update: {
      workspaceId: premiumWorkspace.id,
      locationId: premiumLocationB.id,
      source: ReviewSource.GOOGLE,
      authorName: 'Mihai N.',
      rating: 5,
      text: 'Amazing onboarding and very friendly team. We got help instantly.',
      reviewDate: new Date(now - 8 * 60 * 60 * 1000),
      sentiment: Sentiment.POS,
      tags: ['onboarding', 'team-support'],
      status: 'DRAFTED',
      replyDraft: 'Thank you so much for the kind words. We are glad onboarding felt smooth and helpful.',
      draftedById: premiumMember.id,
      draftedAt: new Date(now - 6 * 60 * 60 * 1000)
    },
    create: {
      id: IDS.reviewPremiumPositive,
      workspaceId: premiumWorkspace.id,
      locationId: premiumLocationB.id,
      source: ReviewSource.GOOGLE,
      authorName: 'Mihai N.',
      rating: 5,
      text: 'Amazing onboarding and very friendly team. We got help instantly.',
      reviewDate: new Date(now - 8 * 60 * 60 * 1000),
      sentiment: Sentiment.POS,
      tags: ['onboarding', 'team-support'],
      status: 'DRAFTED',
      replyDraft: 'Thank you so much for the kind words. We are glad onboarding felt smooth and helpful.',
      draftedById: premiumMember.id,
      draftedAt: new Date(now - 6 * 60 * 60 * 1000)
    }
  });

  await Promise.all([
    prisma.replyGeneration.upsert({
      where: { id: IDS.generationProNegative },
      update: {
        workspaceId: proWorkspace.id,
        reviewId: reviewProNegative.id,
        createdById: member.id,
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        promptVersion: 'v1.0.0',
        length: 'medium',
        escalation: true,
        inputTokens: 310,
        outputTokens: 120,
        estimatedCostUsd: 0.000118,
        replyText: reviewProNegative.replyDraft || ''
      },
      create: {
        id: IDS.generationProNegative,
        workspaceId: proWorkspace.id,
        reviewId: reviewProNegative.id,
        createdById: member.id,
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        promptVersion: 'v1.0.0',
        length: 'medium',
        escalation: true,
        inputTokens: 310,
        outputTokens: 120,
        estimatedCostUsd: 0.000118,
        replyText: reviewProNegative.replyDraft || ''
      }
    }),
    prisma.replyGeneration.upsert({
      where: { id: IDS.generationPremiumNegative },
      update: {
        workspaceId: premiumWorkspace.id,
        reviewId: reviewPremiumNegative.id,
        createdById: premiumMember.id,
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        promptVersion: 'v1.0.0',
        length: 'medium',
        escalation: true,
        inputTokens: 422,
        outputTokens: 158,
        estimatedCostUsd: 0.000158,
        replyText: reviewPremiumNegative.approvedReply || ''
      },
      create: {
        id: IDS.generationPremiumNegative,
        workspaceId: premiumWorkspace.id,
        reviewId: reviewPremiumNegative.id,
        createdById: premiumMember.id,
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        promptVersion: 'v1.0.0',
        length: 'medium',
        escalation: true,
        inputTokens: 422,
        outputTokens: 158,
        estimatedCostUsd: 0.000158,
        replyText: reviewPremiumNegative.approvedReply || ''
      }
    })
  ]);

  await Promise.all([
    prisma.reviewAuditLog.upsert({
      where: { id: IDS.auditProDrafted },
      update: {
        workspaceId: proWorkspace.id,
        reviewId: reviewProNegative.id,
        actorId: member.id,
        action: 'REVIEW_DRAFTED',
        metadata: { provider: 'openai' }
      },
      create: {
        id: IDS.auditProDrafted,
        workspaceId: proWorkspace.id,
        reviewId: reviewProNegative.id,
        actorId: member.id,
        action: 'REVIEW_DRAFTED',
        metadata: { provider: 'openai' }
      }
    }),
    prisma.reviewAuditLog.upsert({
      where: { id: IDS.auditProApproved },
      update: {
        workspaceId: proWorkspace.id,
        reviewId: reviewProPositive.id,
        actorId: owner.id,
        action: 'REVIEW_APPROVED',
        metadata: { statusFrom: 'DRAFTED', statusTo: 'APPROVED' }
      },
      create: {
        id: IDS.auditProApproved,
        workspaceId: proWorkspace.id,
        reviewId: reviewProPositive.id,
        actorId: owner.id,
        action: 'REVIEW_APPROVED',
        metadata: { statusFrom: 'DRAFTED', statusTo: 'APPROVED' }
      }
    }),
    prisma.reviewAuditLog.upsert({
      where: { id: IDS.auditPremiumDrafted },
      update: {
        workspaceId: premiumWorkspace.id,
        reviewId: reviewPremiumNegative.id,
        actorId: premiumMember.id,
        action: 'REVIEW_DRAFTED',
        metadata: { provider: 'openai', workspaceType: 'premium-demo' }
      },
      create: {
        id: IDS.auditPremiumDrafted,
        workspaceId: premiumWorkspace.id,
        reviewId: reviewPremiumNegative.id,
        actorId: premiumMember.id,
        action: 'REVIEW_DRAFTED',
        metadata: { provider: 'openai', workspaceType: 'premium-demo' }
      }
    }),
    prisma.reviewAuditLog.upsert({
      where: { id: IDS.auditPremiumApproved },
      update: {
        workspaceId: premiumWorkspace.id,
        reviewId: reviewPremiumNegative.id,
        actorId: premiumOwner.id,
        action: 'REVIEW_APPROVED',
        metadata: { statusFrom: 'DRAFTED', statusTo: 'APPROVED' }
      },
      create: {
        id: IDS.auditPremiumApproved,
        workspaceId: premiumWorkspace.id,
        reviewId: reviewPremiumNegative.id,
        actorId: premiumOwner.id,
        action: 'REVIEW_APPROVED',
        metadata: { statusFrom: 'DRAFTED', statusTo: 'APPROVED' }
      }
    })
  ]);

  console.log('[seed] Demo data upsert complete.');
  console.log('[seed] Demo credentials:');
  console.log('- owner@example.com / password123');
  console.log('- member@example.com / password123');
  console.log('- superadmin@reply-zen.com / password123');
  console.log('- premium@reply-zen.com / password123');
  console.log('[seed] Demo OTP phones: +40740000001 ... +40740000005');
  console.log('[seed] Use SEED_RESET=true npm run db:seed to fully reset all data.');
}

main().finally(async () => prisma.$disconnect());

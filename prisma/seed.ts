import { PrismaClient, Plan, Role, ReviewSource, Sentiment } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: { email: 'owner@example.com', name: 'Owner', hashedPassword: password }
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Demo Workspace',
      plan: Plan.PRO,
      memberships: { create: { userId: user.id, role: Role.OWNER } },
      locations: { create: { name: 'Downtown Store' } },
      brandVoice: {
        create: {
          tone: 'WARM',
          doList: ['Thank customer', 'Acknowledge specific feedback'],
          dontList: ['Avoid legal promises'],
          examples: ['Thanks for sharing your experience!'],
          bannedWords: ['cheap'],
          signOff: '— The Support Team'
        }
      }
    },
    include: { locations: true }
  });

  await prisma.review.create({
    data: {
      workspaceId: workspace.id,
      locationId: workspace.locations[0].id,
      source: ReviewSource.GOOGLE,
      authorName: 'Jane D.',
      rating: 2,
      text: 'Service was slow and order was wrong.',
      reviewDate: new Date(),
      sentiment: Sentiment.NEG,
      tags: ['speed', 'order-accuracy']
    }
  });
}

main().finally(async () => prisma.$disconnect());

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'AGENCY');

-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('GOOGLE', 'FACEBOOK', 'YELP', 'TRUSTPILOT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NEW', 'DRAFTED', 'APPROVED', 'SENT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POS', 'NEU', 'NEG');

-- CreateEnum
CREATE TYPE "Tone" AS ENUM ('FRIENDLY', 'PROFESSIONAL', 'WARM', 'FUNNY', 'CALM');

-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('OPENAI', 'CLAUDE', 'GEMINI');

-- CreateEnum
CREATE TYPE "SubscriptionProvider" AS ENUM ('STRIPE', 'PAYPAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'APPROVAL_PENDING', 'UNPAID');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('REVIEW_IMPORTED', 'REVIEW_CREATED', 'REVIEW_DRAFTED', 'REVIEW_EDITED', 'REVIEW_APPROVED', 'REVIEW_STATUS_CHANGED', 'TAGS_UPDATED', 'SENTIMENT_UPDATED', 'BRAND_VOICE_UPDATED', 'MEMBER_ADDED', 'MEMBER_ROLE_UPDATED', 'MEMBER_REMOVED', 'SUBSCRIPTION_UPDATED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT,
    "image" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "aiGenerationsUsed" INTEGER NOT NULL DEFAULT 0,
    "monthBucket" TEXT NOT NULL DEFAULT '1970-01',
    "gracePeriodEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "source" "ReviewSource" NOT NULL,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "reviewUrl" TEXT,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "language" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'NEW',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sentiment" "Sentiment" NOT NULL DEFAULT 'NEU',
    "replyDraft" TEXT,
    "approvedReply" TEXT,
    "draftedById" TEXT,
    "draftedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "editedById" TEXT,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandVoice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "locationId" TEXT,
    "tone" "Tone" NOT NULL DEFAULT 'PROFESSIONAL',
    "doList" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dontList" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "examples" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bannedWords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "signOff" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandVoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" "SubscriptionProvider" NOT NULL,
    "externalId" TEXT,
    "status" "SubscriptionStatus" NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "currentPeriodEnd" TIMESTAMP(3),
    "gracePeriodEndsAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplyGeneration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "length" TEXT NOT NULL,
    "targetLanguage" TEXT,
    "escalation" BOOLEAN NOT NULL DEFAULT true,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCostUsd" DECIMAL(10,6),
    "replyText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplyGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "reviewId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" "ReviewSource" NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MANUAL',
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_workspaceId_role_idx" ON "WorkspaceMembership"("workspaceId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMembership_userId_workspaceId_key" ON "WorkspaceMembership"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_workspaceId_name_key" ON "Location"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "Review_workspaceId_status_idx" ON "Review"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Review_workspaceId_source_idx" ON "Review"("workspaceId", "source");

-- CreateIndex
CREATE INDEX "Review_workspaceId_sentiment_idx" ON "Review"("workspaceId", "sentiment");

-- CreateIndex
CREATE INDEX "Review_workspaceId_rating_idx" ON "Review"("workspaceId", "rating");

-- CreateIndex
CREATE INDEX "Review_workspaceId_reviewDate_idx" ON "Review"("workspaceId", "reviewDate");

-- CreateIndex
CREATE UNIQUE INDEX "BrandVoice_workspaceId_key" ON "BrandVoice"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandVoice_locationId_key" ON "BrandVoice"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_externalId_key" ON "Subscription"("externalId");

-- CreateIndex
CREATE INDEX "ReplyGeneration_workspaceId_createdAt_idx" ON "ReplyGeneration"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ReplyGeneration_reviewId_createdAt_idx" ON "ReplyGeneration"("reviewId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewAuditLog_workspaceId_createdAt_idx" ON "ReviewAuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewAuditLog_reviewId_createdAt_idx" ON "ReviewAuditLog"("reviewId", "createdAt");

-- CreateIndex
CREATE INDEX "SourceConnection_workspaceId_provider_idx" ON "SourceConnection"("workspaceId", "provider");

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_draftedById_fkey" FOREIGN KEY ("draftedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandVoice" ADD CONSTRAINT "BrandVoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandVoice" ADD CONSTRAINT "BrandVoice_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyGeneration" ADD CONSTRAINT "ReplyGeneration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyGeneration" ADD CONSTRAINT "ReplyGeneration_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyGeneration" ADD CONSTRAINT "ReplyGeneration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAuditLog" ADD CONSTRAINT "ReviewAuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAuditLog" ADD CONSTRAINT "ReviewAuditLog_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAuditLog" ADD CONSTRAINT "ReviewAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceConnection" ADD CONSTRAINT "SourceConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;


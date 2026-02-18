-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PROFILE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROFILE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROFILE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'PROFILE_VIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'PROFILE_PDF_DOWNLOADED';

-- AlterTable: add GDPR consent and version tracking to PsychosocialProfile
ALTER TABLE "PsychosocialProfile" ADD COLUMN "gdprConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PsychosocialProfile" ADD COLUMN "gdprConsentDate" TIMESTAMP(3);
ALTER TABLE "PsychosocialProfile" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable: ProfileAccessLog for GDPR compliance
CREATE TABLE "ProfileAccessLog" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileAccessLog_profileId_createdAt_idx" ON "ProfileAccessLog"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileAccessLog_actorId_createdAt_idx" ON "ProfileAccessLog"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProfileAccessLog" ADD CONSTRAINT "ProfileAccessLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PsychosocialProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileAccessLog" ADD CONSTRAINT "ProfileAccessLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'PSYCHOSOCIAL_PROFILE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PSYCHOSOCIAL_PDF_EXPORTED';

-- AlterTable
ALTER TABLE "PsychosocialProfile" ADD COLUMN "medicalConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PsychosocialProfile" ADD COLUMN "medicalConsentReference" TEXT;


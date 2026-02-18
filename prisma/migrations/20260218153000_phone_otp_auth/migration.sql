-- AlterTable
ALTER TABLE "User"
ADD COLUMN "phoneNumber" TEXT,
ADD COLUMN "phoneAuthEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateTable
CREATE TABLE "PhoneLoginCode" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "requestedByIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneLoginCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhoneLoginCode_phoneNumber_createdAt_idx" ON "PhoneLoginCode"("phoneNumber", "createdAt");

-- CreateIndex
CREATE INDEX "PhoneLoginCode_phoneNumber_consumedAt_expiresAt_idx" ON "PhoneLoginCode"("phoneNumber", "consumedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "PhoneLoginCode_expiresAt_idx" ON "PhoneLoginCode"("expiresAt");

import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { HttpError } from '@/lib/http';
import { prisma } from '@/lib/prisma';

const OTP_CODE_LENGTH = 6;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_REQUESTS_PER_WINDOW = 5;
const REQUEST_WINDOW_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;

function getOtpTtlMinutes() {
  const parsed = Number(process.env.PHONE_OTP_TTL_MINUTES ?? 5);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(1, Math.min(15, Math.floor(parsed)));
}

function getOtpSecret() {
  return process.env.PHONE_OTP_SECRET || process.env.NEXTAUTH_SECRET || 'phone-otp-fallback-secret-change-me';
}

function hashOtpCode(phoneNumber: string, code: string) {
  return createHmac('sha256', getOtpSecret()).update(`${phoneNumber}:${code}`).digest('hex');
}

function secureEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function normalizeOtpCode(input: string) {
  const compact = input.replace(/\s+/g, '');
  if (!new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`).test(compact)) {
    throw new HttpError(400, 'Codul trebuie sa aiba 6 cifre');
  }
  return compact;
}

export async function issuePhoneLoginCode(input: { phoneNumber: string; requestedByIp?: string | null }) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - REQUEST_WINDOW_MINUTES * 60 * 1000);

  await prisma.phoneLoginCode.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: now } }, { consumedAt: { not: null } }, { attempts: { gte: MAX_VERIFY_ATTEMPTS } }]
    }
  });

  const recentCount = await prisma.phoneLoginCode.count({
    where: {
      phoneNumber: input.phoneNumber,
      createdAt: { gte: windowStart }
    }
  });
  if (recentCount >= MAX_REQUESTS_PER_WINDOW) {
    throw new HttpError(429, 'Prea multe coduri solicitate. Incearca din nou in cateva minute.');
  }

  const latest = await prisma.phoneLoginCode.findFirst({
    where: { phoneNumber: input.phoneNumber },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true }
  });
  if (latest) {
    const secondsSinceLast = Math.floor((now.getTime() - latest.createdAt.getTime()) / 1000);
    if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
      throw new HttpError(429, `Asteapta ${RESEND_COOLDOWN_SECONDS - secondsSinceLast}s inainte de o noua solicitare`);
    }
  }

  const code = String(randomInt(0, 10 ** OTP_CODE_LENGTH)).padStart(OTP_CODE_LENGTH, '0');
  const expiresAt = new Date(now.getTime() + getOtpTtlMinutes() * 60 * 1000);

  await prisma.phoneLoginCode.create({
    data: {
      phoneNumber: input.phoneNumber,
      codeHash: hashOtpCode(input.phoneNumber, code),
      expiresAt,
      requestedByIp: input.requestedByIp ?? null
    }
  });

  return { code, expiresAt };
}

export async function verifyPhoneLoginCode(input: { phoneNumber: string; code: string }) {
  const now = new Date();
  const normalizedCode = normalizeOtpCode(input.code);

  const activeCode = await prisma.phoneLoginCode.findFirst({
    where: {
      phoneNumber: input.phoneNumber,
      consumedAt: null,
      expiresAt: { gt: now }
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, codeHash: true, attempts: true }
  });
  if (!activeCode) return false;
  if (activeCode.attempts >= MAX_VERIFY_ATTEMPTS) return false;

  const expectedHash = hashOtpCode(input.phoneNumber, normalizedCode);
  const valid = secureEqualHex(activeCode.codeHash, expectedHash);

  if (!valid) {
    await prisma.phoneLoginCode.update({
      where: { id: activeCode.id },
      data: { attempts: { increment: 1 } }
    });
    return false;
  }

  await prisma.phoneLoginCode.update({
    where: { id: activeCode.id },
    data: {
      consumedAt: now,
      attempts: { increment: 1 }
    }
  });
  return true;
}

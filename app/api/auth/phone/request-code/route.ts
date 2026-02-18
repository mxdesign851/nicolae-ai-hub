import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, jsonError } from '@/lib/http';
import { issuePhoneLoginCode } from '@/lib/phone-auth';
import { maskPhoneNumber, normalizePhoneNumber } from '@/lib/phone';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  phoneNumber: z.string().min(7).max(32)
});

function getRequestIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return request.headers.get('x-real-ip') || null;
}

async function dispatchPhoneCode(input: { phoneNumber: string; code: string }) {
  const webhookUrl = process.env.SMS_WEBHOOK_URL;
  if (webhookUrl) {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: input.phoneNumber,
        message: `Codul tau de autentificare este ${input.code}. Valabil 5 minute.`,
        channel: 'sms'
      })
    });
    if (!response.ok) {
      throw new HttpError(502, 'Nu am putut trimite codul prin serviciul SMS');
    }
    return;
  }

  // Fallback local pentru medii interne fara gateway SMS conectat.
  console.info(`[phone-auth] OTP code for ${input.phoneNumber}: ${input.code}`);
}

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    const phoneNumber = normalizePhoneNumber(parsed.phoneNumber);
    if (!phoneNumber) {
      throw new HttpError(400, 'Numar de telefon invalid');
    }

    const user = await prisma.user.findFirst({
      where: {
        phoneNumber,
        phoneAuthEnabled: true
      },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({
        ok: true,
        message: 'Daca numarul exista in sistem, codul a fost trimis.'
      });
    }

    const result = await issuePhoneLoginCode({
      phoneNumber,
      requestedByIp: getRequestIp(request)
    });
    await dispatchPhoneCode({
      phoneNumber,
      code: result.code
    });

    const allowDebugCode = process.env.NODE_ENV !== 'production' && process.env.PHONE_OTP_DEBUG !== 'false';
    return NextResponse.json({
      ok: true,
      message: `Codul de autentificare a fost trimis catre ${maskPhoneNumber(phoneNumber)}.`,
      expiresAt: result.expiresAt.toISOString(),
      ...(allowDebugCode ? { debugCode: result.code } : {})
    });
  } catch (error) {
    return jsonError(error);
  }
}

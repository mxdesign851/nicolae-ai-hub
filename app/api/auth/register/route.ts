import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { HttpError, jsonError } from '@/lib/http';
import { normalizePhoneNumber } from '@/lib/phone';
import { sanitizeEmail, sanitizeText } from '@/lib/sanitize';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().max(100).optional(),
  phoneNumber: z.string().max(32).optional().nullable()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);

    const email = sanitizeEmail(parsed.email);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, 'Email already registered');

    const phoneNumber = normalizePhoneNumber(parsed.phoneNumber);
    if (phoneNumber) {
      const phoneTaken = await prisma.user.findFirst({
        where: { phoneNumber },
        select: { id: true }
      });
      if (phoneTaken) {
        throw new HttpError(409, 'Numarul de telefon este deja inregistrat');
      }
    }

    const hashedPassword = await bcrypt.hash(parsed.password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name: parsed.name ? sanitizeText(parsed.name, 100) : null,
        phoneNumber,
        phoneAuthEnabled: Boolean(phoneNumber)
      },
      select: { id: true, email: true, name: true, phoneNumber: true, phoneAuthEnabled: true, createdAt: true }
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

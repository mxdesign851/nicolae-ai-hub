import { HttpError } from '@/lib/http';
import { sanitizeOptionalText } from '@/lib/sanitize';

const PHONE_ALLOWED_PATTERN = /^[+0-9()\-.\s]{7,24}$/;
const PHONE_E164_PATTERN = /^\+\d{8,15}$/;

export function normalizePhoneNumber(input: string | null | undefined) {
  const cleaned = sanitizeOptionalText(input, 32);
  if (!cleaned) return null;
  if (!PHONE_ALLOWED_PATTERN.test(cleaned)) {
    throw new HttpError(400, 'Numar de telefon invalid');
  }

  let normalized = cleaned.replace(/[()\-.\s]/g, '');
  if (normalized.startsWith('00')) {
    normalized = `+${normalized.slice(2)}`;
  }
  if (!normalized.startsWith('+')) {
    normalized = `+${normalized}`;
  }
  if (!PHONE_E164_PATTERN.test(normalized)) {
    throw new HttpError(400, 'Numar de telefon invalid');
  }

  return normalized;
}

export function maskPhoneNumber(phoneNumber: string | null | undefined) {
  if (!phoneNumber) return '-';
  if (phoneNumber.length <= 5) return `${phoneNumber.slice(0, 2)}***`;
  return `${phoneNumber.slice(0, 3)}***${phoneNumber.slice(-2)}`;
}

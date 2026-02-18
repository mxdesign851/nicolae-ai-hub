const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

export function sanitizeText(input: string, maxLen = 5000) {
  return input.replace(CONTROL_CHARS, '').trim().slice(0, maxLen);
}

export function sanitizeEmail(input: string) {
  return sanitizeText(input, 320).toLowerCase();
}

export function sanitizeOptionalText(input?: string | null, maxLen = 5000) {
  if (!input) return null;
  const cleaned = sanitizeText(input, maxLen);
  return cleaned.length ? cleaned : null;
}

export function sanitizeTag(tag: string) {
  return sanitizeText(tag, 40)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function sanitizeTags(tags: string[]) {
  const unique = new Set<string>();
  for (const rawTag of tags) {
    const cleaned = sanitizeTag(rawTag);
    if (cleaned) unique.add(cleaned);
    if (unique.size >= 20) break;
  }
  return Array.from(unique);
}

export function sanitizeUrl(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.toString().slice(0, 500);
  } catch {
    return null;
  }
}

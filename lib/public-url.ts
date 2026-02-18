const LOCAL_HOSTS = new Set(['0.0.0.0', '127.0.0.1', 'localhost']);

function sanitizeUrlInput(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.includes('.')) {
    return `https://${trimmed}`;
  }

  return null;
}

function parseCandidate(value?: string | null) {
  const sanitized = sanitizeUrlInput(value);
  if (!sanitized) return null;

  try {
    return new URL(sanitized);
  } catch {
    return null;
  }
}

function isPublicInCurrentEnv(url: URL) {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  return !LOCAL_HOSTS.has(url.hostname);
}

function fromRequestHeaders(request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = request.headers.get('host');
  const rawHost = (forwardedHost || host || '').split(',')[0]?.trim();
  if (!rawHost) return null;

  const protoHeader = request.headers.get('x-forwarded-proto') || 'https';
  const proto = protoHeader.split(',')[0]?.trim() || 'https';
  const candidate = parseCandidate(`${proto}://${rawHost}`);
  if (!candidate || !isPublicInCurrentEnv(candidate)) {
    return null;
  }

  return candidate;
}

export function resolvePublicAppUrl(request?: Request) {
  const candidates = [
    parseCandidate(process.env.APP_URL),
    parseCandidate(process.env.NEXTAUTH_URL),
    parseCandidate(process.env.RAILWAY_PUBLIC_DOMAIN),
    parseCandidate(
      process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null
    ),
    request ? fromRequestHeaders(request) : null
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (!isPublicInCurrentEnv(candidate)) continue;
    return candidate;
  }

  return null;
}

export function ensureNextAuthPublicUrl() {
  const rawNextAuthUrl = process.env.NEXTAUTH_URL;
  const currentNextAuthUrl = parseCandidate(process.env.NEXTAUTH_URL);
  const resolved = resolvePublicAppUrl();
  if (!resolved) {
    const hasInvalidConfiguredUrl =
      typeof rawNextAuthUrl === 'string' &&
      rawNextAuthUrl.length > 0 &&
      (!currentNextAuthUrl || !isPublicInCurrentEnv(currentNextAuthUrl));

    if (hasInvalidConfiguredUrl) {
      // Allow NextAuth to infer host from forwarded headers instead of using a local internal URL.
      delete process.env.NEXTAUTH_URL;
    }
    return null;
  }

  const normalizedOrigin = resolved.origin;
  if (process.env.NEXTAUTH_URL !== normalizedOrigin) {
    process.env.NEXTAUTH_URL = normalizedOrigin;
  }

  return normalizedOrigin;
}

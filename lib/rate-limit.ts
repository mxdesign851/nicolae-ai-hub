type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

type WindowEntry = {
  timestamps: number[];
};

const buckets = new Map<string, WindowEntry>();

export function checkRateLimit(key: string, config: RateLimitConfig) {
  const now = Date.now();
  const minTimestamp = now - config.windowMs;
  const entry = buckets.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((ts) => ts >= minTimestamp);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldest = entry.timestamps[0] ?? now;
    const retryAfterMs = config.windowMs - (now - oldest);
    buckets.set(key, entry);
    return {
      success: false,
      remaining: 0,
      retryAfterMs: Math.max(1000, retryAfterMs)
    };
  }

  entry.timestamps.push(now);
  buckets.set(key, entry);
  return {
    success: true,
    remaining: config.maxRequests - entry.timestamps.length,
    retryAfterMs: 0
  };
}

export function compactRateLimitBuckets(maxIdleMs = 5 * 60 * 1000) {
  const cutoff = Date.now() - maxIdleMs;
  for (const [key, entry] of buckets.entries()) {
    if (!entry.timestamps.length || entry.timestamps[entry.timestamps.length - 1] < cutoff) {
      buckets.delete(key);
    }
  }
}

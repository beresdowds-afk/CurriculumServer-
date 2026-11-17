import type { NextFunction, Request, RequestHandler, Response } from 'express';

export interface SlidingWindowRateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  serviceLabel: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

interface BucketEntry {
  timestamps: number[];
  lastSeen: number;
}

export function createSlidingWindowRateLimiter(
  options: SlidingWindowRateLimiterOptions
): RequestHandler & { reset(): void; inspectKey(key: string): number } {
  const windowMs = Math.max(1_000, Math.floor(options.windowMs));
  const maxRequests = Math.max(1, Math.floor(options.maxRequests));
  const buckets = new Map<string, BucketEntry>();
  let requestCounter = 0;

  const pruneStale = (now: number) => {
    const cutoff = now - windowMs;
    for (const [key, entry] of buckets.entries()) {
      if (entry.lastSeen < cutoff) {
        buckets.delete(key);
      }
    }
  };

  const resolveKey = (req: Request): string => {
    if (options.keyGenerator) return options.keyGenerator(req);
    const tenantId = (req as any).trustedTenantContext?.tenantId;
    const headerTenant = typeof req.headers['x-tenant-id'] === 'string' ? req.headers['x-tenant-id'].trim() : '';
    const actorScope = tenantId || headerTenant || req.ip || 'anonymous';
    return `${options.serviceLabel}:${actorScope}`;
  };

  const handler = ((req: Request, res: Response, next: NextFunction) => {
    if (options.skip?.(req) || req.method === 'OPTIONS') {
      next();
      return;
    }

    const now = Date.now();
    requestCounter += 1;
    if (requestCounter % 250 === 0) {
      pruneStale(now);
    }

    const key = resolveKey(req);
    const cutoff = now - windowMs;
    const entry = buckets.get(key) ?? { timestamps: [], lastSeen: now };
    entry.timestamps = entry.timestamps.filter(ts => ts > cutoff);
    entry.lastSeen = now;

    if (entry.timestamps.length >= maxRequests) {
      const oldest = entry.timestamps[0] ?? now;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      buckets.set(key, entry);
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(Math.ceil((oldest + windowMs) / 1000)));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        success: false,
        error: `Rate limit exceeded for ${options.serviceLabel}. Retry after ${retryAfterSeconds}s.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds,
        correlationId: (req as any).correlationId,
        timestamp: new Date().toISOString()
      });
      return;
    }

    entry.timestamps.push(now);
    buckets.set(key, entry);
    const remaining = Math.max(0, maxRequests - entry.timestamps.length);
    const resetAt = Math.ceil(((entry.timestamps[0] ?? now) + windowMs) / 1000);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetAt));
    next();
  }) as RequestHandler & { reset(): void; inspectKey(key: string): number };

  handler.reset = () => {
    buckets.clear();
    requestCounter = 0;
  };
  handler.inspectKey = (key: string) => {
    const entry = buckets.get(key);
    if (!entry) return 0;
    const cutoff = Date.now() - windowMs;
    return entry.timestamps.filter(ts => ts > cutoff).length;
  };

  return handler;
}

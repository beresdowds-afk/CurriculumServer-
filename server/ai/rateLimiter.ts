import { AiGatewayError } from './types';

interface BucketEntry {
  timestamps: number[];
}

/**
 * Per-tenant & per-capability sliding-window rate limiter + concurrent request limiter.
 */
export class AiGatewayTrafficController {
  private readonly windows = new Map<string, BucketEntry>();
  private readonly activeConcurrency = new Map<string, number>();

  checkAndConsumeRateLimit(key: string, limitPerMinute: number, now = Date.now()): void {
    const windowMs = 60_000;
    const cutoff = now - windowMs;
    const entry = this.windows.get(key) || { timestamps: [] };
    entry.timestamps = entry.timestamps.filter(ts => ts > cutoff);

    if (entry.timestamps.length >= limitPerMinute) {
      const oldest = entry.timestamps[0] ?? now;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      this.windows.set(key, entry);
      throw new AiGatewayError(
        'RATE_LIMIT_EXCEEDED',
        `AI Gateway rate limit exceeded for '${key}'. Retry after ${retryAfterSeconds}s.`,
        429,
        { key, limitPerMinute, retryAfterSeconds }
      );
    }

    entry.timestamps.push(now);
    this.windows.set(key, entry);
  }

  acquireConcurrencySlot(key: string, maxConcurrency: number): () => void {
    const current = this.activeConcurrency.get(key) || 0;
    if (current >= maxConcurrency) {
      throw new AiGatewayError(
        'CONCURRENCY_LIMIT_EXCEEDED',
        `Concurrent AI request limit (${maxConcurrency}) reached for '${key}'.`,
        429,
        { key, maxConcurrency, active: current }
      );
    }
    this.activeConcurrency.set(key, current + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const latest = this.activeConcurrency.get(key) || 1;
      if (latest <= 1) {
        this.activeConcurrency.delete(key);
      } else {
        this.activeConcurrency.set(key, latest - 1);
      }
    };
  }

  reset(): void {
    this.windows.clear();
    this.activeConcurrency.clear();
  }
}

export const defaultAiTrafficController = new AiGatewayTrafficController();

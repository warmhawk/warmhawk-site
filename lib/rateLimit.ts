import type { NextRequest } from 'next/server';

/**
 * In-memory, per-process rate limiting. docker-compose.deploy.yml runs exactly one `web` container
 * (its own header comment: "Single stateless service... this app has no persistent state to survive
 * a redeploy") -- there is no horizontal scaling here to make an in-memory counter inconsistent
 * across instances, so a plain Map is sufficient; no Redis or other shared store needed. Counters
 * reset on every deploy/restart, an acceptable tradeoff for abuse mitigation, not a hard security
 * boundary.
 */

interface RateLimiter {
  /** Returns true if `key` is currently allowed another request under this limiter's window. */
  check(key: string): boolean;
}

const SWEEP_INTERVAL_CHECKS = 1000;

/** Fixed-window counter: simpler than a sliding window and sufficient for flood protection -- the
 *  use case here is protecting a shared upstream credential's own rate limit (GitHub's API, the
 *  registry token issuer), not billing-grade metering. */
export function createRateLimiter(opts: { maxRequests: number; windowMs: number }): RateLimiter {
  const windowStartByKey = new Map<string, number>();
  const countByKey = new Map<string, number>();
  let checksSinceSweep = 0;

  // Opportunistic cleanup so a flood from many distinct source IPs -- precisely the attack this
  // module exists to mitigate -- can't grow these maps unboundedly between deploys.
  function sweepExpired(now: number) {
    for (const [key, windowStart] of windowStartByKey) {
      if (now - windowStart >= opts.windowMs) {
        windowStartByKey.delete(key);
        countByKey.delete(key);
      }
    }
  }

  return {
    check(key: string): boolean {
      const now = Date.now();
      checksSinceSweep += 1;
      if (checksSinceSweep >= SWEEP_INTERVAL_CHECKS) {
        checksSinceSweep = 0;
        sweepExpired(now);
      }

      const windowStart = windowStartByKey.get(key);
      if (windowStart === undefined || now - windowStart >= opts.windowMs) {
        windowStartByKey.set(key, now);
        countByKey.set(key, 1);
        return true;
      }

      const count = (countByKey.get(key) ?? 0) + 1;
      countByKey.set(key, count);
      return count <= opts.maxRequests;
    },
  };
}

/**
 * The genuine client IP -- trustworthy only because the edge nginx config in front of this app
 * resolves Cloudflare's CF-Connecting-IP into $remote_addr (via set_real_ip_from/real_ip_header)
 * before forwarding it as X-Real-IP (see nginx.conf.template). Falls back to X-Forwarded-For's
 * first hop, then a constant for local dev / direct-connection requests carrying neither header.
 */
export function clientIp(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]!.trim();
  return 'unknown';
}

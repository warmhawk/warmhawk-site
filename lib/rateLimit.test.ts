import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createRateLimiter, clientIp } from './rateLimit';

describe('createRateLimiter', () => {
  it('allows requests up to maxRequests within the window, then rejects', () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 });

    expect(limiter.check('a')).toBe(true);
    expect(limiter.check('a')).toBe(true);
    expect(limiter.check('a')).toBe(true);
    expect(limiter.check('a')).toBe(false);
  });

  it('tracks each key independently', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });

    expect(limiter.check('a')).toBe(true);
    expect(limiter.check('b')).toBe(true);
    expect(limiter.check('a')).toBe(false);
    expect(limiter.check('b')).toBe(false);
  });

  it('resets a key once its window has elapsed', () => {
    vi.useFakeTimers();
    try {
      const limiter = createRateLimiter({ maxRequests: 1, windowMs: 1000 });

      expect(limiter.check('a')).toBe(true);
      expect(limiter.check('a')).toBe(false);

      vi.advanceTimersByTime(1000);

      expect(limiter.check('a')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('clientIp', () => {
  function requestWithHeaders(headers: Record<string, string>) {
    return new NextRequest('http://localhost/whatever', { headers });
  }

  it('prefers x-real-ip when present', () => {
    const request = requestWithHeaders({
      'x-real-ip': '203.0.113.5',
      'x-forwarded-for': '198.51.100.9, 10.0.0.1',
    });
    expect(clientIp(request)).toBe('203.0.113.5');
  });

  it('falls back to the first hop of x-forwarded-for', () => {
    const request = requestWithHeaders({ 'x-forwarded-for': '198.51.100.9, 10.0.0.1' });
    expect(clientIp(request)).toBe('198.51.100.9');
  });

  it('falls back to a constant when neither header is present', () => {
    const request = requestWithHeaders({});
    expect(clientIp(request)).toBe('unknown');
  });
});

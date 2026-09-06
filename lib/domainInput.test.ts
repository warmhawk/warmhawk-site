import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalise } from './domainInput';

/**
 * The drift guard.
 *
 * `lib/domainInput.ts` is a deliberate duplicate of the probe's validator — two trust boundaries,
 * not one shared helper. Duplication only stays safe while both copies agree, so both repos assert
 * the SAME fixture file, copied verbatim between them.
 *
 * If this suite fails after a change, the two validators have diverged and a visitor is about to
 * be told a domain is fine that the probe will then reject.
 */
const vectors = JSON.parse(
  readFileSync(join(process.cwd(), 'tests/fixtures/domain-vectors.json'), 'utf8'),
) as {
  accepted: { input: string; expected: string; why: string }[];
  rejected: { input: string; reason: string }[];
  injectionAttempts: string[];
};

describe('domainInput — shared fixture', () => {
  it.each(vectors.accepted)('accepts $input ($why)', ({ input, expected }) => {
    const result = normalise(input, 15);
    expect(result.domains).toEqual([expected]);
  });

  it.each(vectors.rejected)('rejects $input as $reason', ({ input, reason }) => {
    const result = normalise(input, 15);
    expect(result.domains).toEqual([]);
    expect(result.rejected[0]?.reason).toBe(reason);
  });

  it.each(vectors.injectionAttempts)('never lets %s through as a domain', (attempt) => {
    const result = normalise(attempt, 15);
    // The allowlist makes the dangerous characters inexpressible rather than escaped: whatever
    // survives contains only [a-z0-9.-], so there is nothing left to inject with.
    for (const domain of result.domains) {
      expect(domain).toMatch(/^[a-z0-9.-]+$/);
    }
  });
});

describe('domainInput — the batch cap must be visible', () => {
  it('reports how many domains were dropped for exceeding the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => `d${i}.com`).join('\n');
    const result = normalise(many, 15);
    expect(result.domains).toHaveLength(15);
    expect(result.overCap).toBe(5);
  });

  it('keeps overCap distinct from truncated — they mean different things to a visitor', () => {
    const many = Array.from({ length: 20 }, (_, i) => `d${i}.com`).join('\n');
    const result = normalise(many, 15);
    expect(result.truncated).toBe(false); // the text was never cut; the LIST was
  });
});

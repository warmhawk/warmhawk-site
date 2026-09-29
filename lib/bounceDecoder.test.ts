import { describe, expect, it } from 'vitest';
import {
  decodeBounce,
  detectProvider,
  extractEnhancedCodes,
  extractReplyCode,
  findEntryByCode,
  fixedPhrase,
} from './bounceDecoder';
import { smtpErrors } from './smtpErrors';

const GMAIL_526 = `The response from the remote server was:
550-5.7.26 This email has been blocked because the sender is unauthenticated.
550-5.7.26 Gmail requires all senders to authenticate with either SPF or DKIM.
550 5.7.26  https://support.google.com/mail/answer/81126 d2e1a72fcca58-7b-si.123 - gsmtp`;

const MS_708 = `Remote server returned '550 5.7.708 Service unavailable. Access denied, traffic not accepted from this IP. For more information please go to http://go.microsoft.com/fwlink/?LinkId=526653 AS(8561) [BN8NAM12FT012.eop-nam12.prod.protection.outlook.com 2026-09-29T10:00:00.000Z]'`;

describe('extractEnhancedCodes()', () => {
  it('finds each code once, in order, across multi-line Gmail bounces', () => {
    expect(extractEnhancedCodes(GMAIL_526)).toEqual(['5.7.26']);
  });

  it('never reads the octets of an IP address as a status code', () => {
    expect(extractEnhancedCodes('banned sending IP [40.107.5.7] and 5.7.100.2')).toEqual([]);
  });

  it('accepts a code at the end of a sentence', () => {
    expect(extractEnhancedCodes('It failed with 5.1.1.')).toEqual(['5.1.1']);
  });

  it('ignores 2.x.x success codes', () => {
    expect(extractEnhancedCodes('250 2.0.0 OK')).toEqual([]);
  });
});

describe('extractReplyCode()', () => {
  it('reads the reply code from both "550-" continuation and "550 " final lines', () => {
    expect(extractReplyCode(GMAIL_526)).toBe('550');
    expect(extractReplyCode('421 4.7.28 Gmail has detected an unusual rate')).toBe('421');
  });
});

describe('detectProvider()', () => {
  it('recognises Gmail and Microsoft bounces', () => {
    expect(detectProvider(GMAIL_526)).toBe('gmail');
    expect(detectProvider(MS_708)).toBe('microsoft');
    expect(detectProvider('550 5.1.1 user unknown')).toBeNull();
  });
});

describe('findEntryByCode()', () => {
  it('resolves exact codes, temporary aliases and documented ranges', () => {
    expect(findEntryByCode('5.7.708')?.slug).toBe('5-7-708');
    expect(findEntryByCode('4.7.26')?.slug).toBe('5-7-26');
    expect(findEntryByCode('5.7.620')?.slug).toBe('5-7-606');
    expect(findEntryByCode('4.7.650')?.slug).toBe('4-7-500');
    expect(findEntryByCode('4.7.860')?.slug).toBe('4-7-500');
    expect(findEntryByCode('5.7.650')).toBeUndefined();
    expect(findEntryByCode('9.9.9')).toBeUndefined();
  });
});

describe('fixedPhrase()', () => {
  it('drops placeholders and keeps the longest literal run', () => {
    expect(fixedPhrase('Access denied, banned sending IP [IP1.IP2.IP3.IP4]')).toBe(
      'access denied, banned sending ip',
    );
  });

  it('refuses runs too generic to match on', () => {
    expect(fixedPhrase('Message expired')).toBeNull();
  });
});

describe('decodeBounce()', () => {
  it('decodes a real-shaped Gmail 5.7.26 bounce to its page and Gmail wording', () => {
    const result = decodeBounce(GMAIL_526);
    expect(result.provider).toBe('gmail');
    expect(result.replyCode).toBe('550');
    expect(result.permanence).toBe('permanent');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.entry.slug).toBe('5-7-26');
    expect(result.matches[0]?.variant?.reply).toBe('550 5.7.26');
  });

  it('decodes a Microsoft 5.7.708 bounce', () => {
    const result = decodeBounce(MS_708);
    expect(result.provider).toBe('microsoft');
    expect(result.matches[0]?.entry.slug).toBe('5-7-708');
    expect(result.matches[0]?.variant?.provider).toBe('microsoft');
  });

  it('picks the variant whose wording appears in the paste, not just the first one', () => {
    const result = decodeBounce(
      '421-4.7.28 Gmail has detected an unusual rate of unsolicited email containing one of your URL domains. - gsmtp',
    );
    expect(result.permanence).toBe('temporary');
    expect(result.matches[0]?.entry.slug).toBe('5-7-28');
    expect(result.matches[0]?.variant?.text).toContain('URL domains');
  });

  it('falls back to matching documented wording when no code is pasted', () => {
    const result = decodeBounce(
      'Access denied, sending domain EXAMPLE.COM does not pass DMARC verification and has a DMARC policy of reject.',
    );
    expect(result.matches[0]?.entry.slug).toBe('5-7-509');
    expect(result.matches[0]?.matchedBy).toBe('text');
  });

  it('reports codes the dictionary does not cover instead of guessing', () => {
    const result = decodeBounce('554 5.3.4 Message too big for system');
    expect(result.matches).toEqual([]);
    expect(result.unknownCodes).toEqual(['5.3.4']);
  });

  it('returns an empty result for text with no bounce in it', () => {
    const result = decodeBounce('hello world');
    expect(result).toEqual({
      provider: null,
      replyCode: null,
      permanence: null,
      matches: [],
      unknownCodes: [],
    });
  });
});

describe('smtpErrors dictionary', () => {
  it('has unique slugs that are the URL form of each code', () => {
    const slugs = smtpErrors.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const entry of smtpErrors) expect(entry.slug).toBe(entry.code.replace(/\./g, '-'));
  });

  it('never routes one code to two pages', () => {
    const claimed = new Map<string, string>();
    for (const entry of smtpErrors) {
      for (const code of [entry.code, ...entry.aliases]) {
        expect(claimed.get(code), `${code} claimed twice`).toBeUndefined();
        claimed.set(code, entry.slug);
      }
    }
  });

  it('keeps every summary in the 40–60 word AnswerBlock range', () => {
    for (const entry of smtpErrors) {
      const words = entry.summary.trim().split(/\s+/).length;
      expect(words, `${entry.slug} summary is ${words} words`).toBeGreaterThanOrEqual(40);
      expect(words, `${entry.slug} summary is ${words} words`).toBeLessThanOrEqual(60);
    }
  });

  it('cites at least one source and links only to real related pages', () => {
    const slugs = new Set(smtpErrors.map((entry) => entry.slug));
    for (const entry of smtpErrors) {
      expect(entry.sources.length).toBeGreaterThan(0);
      for (const related of entry.related) {
        expect(slugs.has(related), `${entry.slug} → ${related}`).toBe(true);
      }
    }
  });

  it('decodes every documented variant back to its own page', () => {
    for (const entry of smtpErrors) {
      for (const variant of entry.variants) {
        const result = decodeBounce(`${variant.reply.replace(/-\d+$/, '')} ${variant.text}`);
        expect(result.matches[0]?.entry.slug, `${entry.slug}: ${variant.reply}`).toBe(entry.slug);
      }
    }
  });
});

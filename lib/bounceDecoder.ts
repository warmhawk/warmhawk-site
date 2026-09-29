import {
  smtpErrors,
  type ErrorProvider,
  type ErrorVariant,
  type SmtpErrorEntry,
} from './smtpErrors';

/**
 * The pure logic behind the /errors "paste your bounce message" decoder. Kept free of React so
 * the matching rules are unit-tested directly (lib/bounceDecoder.test.ts); the client component
 * only renders what decodeBounce() returns. Nothing pasted ever leaves the browser.
 */

export interface DecodedMatch {
  /** The enhanced status code as it appeared in the paste, or the entry's code for text matches. */
  code: string;
  entry: SmtpErrorEntry;
  /** The documented message that best matches the paste, when one can be picked. */
  variant?: ErrorVariant;
  matchedBy: 'code' | 'text';
}

export interface DecodeResult {
  provider: Exclude<ErrorProvider, 'rfc' | 'outlook-com'> | null;
  /** The 3-digit SMTP reply code (e.g. "550"), if one was found. */
  replyCode: string | null;
  permanence: 'temporary' | 'permanent' | null;
  matches: DecodedMatch[];
  /** Enhanced codes that were found in the paste but aren't in the dictionary. */
  unknownCodes: string[];
}

// Not preceded by a digit or dot, and not followed by ".<digit>", so the octets of an IP address
// such as 40.107.5.7 or 5.7.100.2 are never read as a status code.
const ENHANCED_CODE = /(?<![\d.])([45])\.(\d{1,3})\.(\d{1,3})(?!\.?\d)/g;
const REPLY_CODE = /(?<![\d.])([45]\d{2})(?=[\s-])/;

export function extractEnhancedCodes(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(ENHANCED_CODE)) {
    const code = `${match[1]}.${Number(match[2])}.${Number(match[3])}`;
    if (!found.includes(code)) found.push(code);
  }
  return found;
}

export function extractReplyCode(text: string): string | null {
  return text.match(REPLY_CODE)?.[1] ?? null;
}

export function detectProvider(text: string): DecodeResult['provider'] {
  if (/\bgsmtp\b|google\.com|googlemail\.com|\bgmail\b/i.test(text)) return 'gmail';
  if (/outlook\.com|office365|microsoft|exchange online|hotmail\.com|\bAS\(\d+\)/i.test(text)) {
    return 'microsoft';
  }
  return null;
}

function parse(code: string): [number, number, number] {
  const [a, b, c] = code.split('.').map(Number);
  return [a ?? 0, b ?? 0, c ?? 0];
}

function inRange(code: string, [low, high]: readonly [string, string]): boolean {
  const [cls, subject, detail] = parse(code);
  const [lowCls, lowSubject, lowDetail] = parse(low);
  const [, , highDetail] = parse(high);
  return cls === lowCls && subject === lowSubject && detail >= lowDetail && detail <= highDetail;
}

/** Resolve an enhanced status code to its dictionary page: exact code, alias, then range. */
export function findEntryByCode(code: string): SmtpErrorEntry | undefined {
  return (
    smtpErrors.find((entry) => entry.code === code) ??
    smtpErrors.find((entry) => entry.aliases.includes(code)) ??
    smtpErrors.find((entry) => entry.ranges?.some((range) => inRange(code, range)))
  );
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ');
}

/**
 * The longest fixed run of a documented message — the text between placeholders such as
 * "[IP1.IP2.IP3.IP4]", "<domain>" or "$SenderDomain" — used to recognise that message inside a
 * real bounce, where the placeholders are filled in. Runs under 20 characters are too generic to
 * match on ("Message expired", "Recipient not found") and return null.
 */
export function fixedPhrase(variantText: string): string | null {
  const runs = normalize(variantText)
    .split(/\[[^\]]*\]|<[^>]*>|\$\w+|\bxxx, yyy\b/)
    .map((run) => run.trim().replace(/[.,:;]+$/, ''));
  const longest = runs.reduce((best, run) => (run.length > best.length ? run : best), '');
  return longest.length >= 20 ? longest : null;
}

function variantInText(variant: ErrorVariant, normalizedText: string): boolean {
  const phrase = fixedPhrase(variant.text);
  return phrase !== null && normalizedText.includes(phrase);
}

function pickVariant(
  entry: SmtpErrorEntry,
  normalizedText: string,
  provider: DecodeResult['provider'],
): ErrorVariant | undefined {
  const byText = entry.variants.find((variant) => variantInText(variant, normalizedText));
  if (byText) return byText;
  if (provider === 'gmail') return entry.variants.find((v) => v.provider === 'gmail');
  if (provider === 'microsoft') {
    return entry.variants.find((v) => v.provider === 'microsoft' || v.provider === 'outlook-com');
  }
  return undefined;
}

export function decodeBounce(text: string): DecodeResult {
  const normalizedText = normalize(text);
  const provider = detectProvider(text);
  const replyCode = extractReplyCode(text);
  const codes = extractEnhancedCodes(text);

  const matches: DecodedMatch[] = [];
  const unknownCodes: string[] = [];

  for (const code of codes) {
    const entry = findEntryByCode(code);
    if (!entry) {
      unknownCodes.push(code);
      continue;
    }
    if (matches.some((match) => match.entry.slug === entry.slug)) continue;
    matches.push({
      code,
      entry,
      variant: pickVariant(entry, normalizedText, provider),
      matchedBy: 'code',
    });
  }

  // A bounce pasted without its status code (some mail clients show only the sentence) can still
  // be recognised by its documented wording.
  if (matches.length === 0) {
    for (const entry of smtpErrors) {
      const variant = entry.variants.find((v) => variantInText(v, normalizedText));
      if (variant) matches.push({ code: entry.code, entry, variant, matchedBy: 'text' });
    }
  }

  const firstClass = replyCode?.[0] ?? codes[0]?.[0] ?? null;
  const permanence = firstClass === '4' ? 'temporary' : firstClass === '5' ? 'permanent' : null;

  return { provider, replyCode, permanence, matches, unknownCodes };
}

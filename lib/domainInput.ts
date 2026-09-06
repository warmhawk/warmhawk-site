/**
 * Input normalisation and validation — the SITE's copy.
 *
 * The controlling idea is **allowlist, not filter**. After validation a domain contains only
 * `[a-z0-9.-]`, which makes `< > " ' \` & ; | $ \n \r \0 -- /*` *inexpressible* rather than
 * escaped. Escaping is a promise about every downstream consumer; an allowlist is a property of
 * the string itself, and it survives being logged, templated, concatenated into a DNS query and
 * rendered into JSX by five different people who never read this comment.
 *
 * The length cap runs BEFORE any regex. Handing a backtracking regex a multi-megabyte string of
 * dots is CPU exhaustion whether or not it is an injection attempt.
 *
 * ⚠️ **This file is duplicated from the probe on purpose. Do not "fix" the duplication.**
 * The site and the probe are two trust boundaries, not one shared helper: this copy exists to
 * give the visitor instant feedback before a request is made, and the probe's copy exists because
 * the probe cannot trust its caller — including this one. Deleting either one turns a boundary
 * into a single point of failure.
 *
 * They are kept honest by a shared fixture, `tests/fixtures/domain-vectors.json`, copied verbatim
 * between the two repos and asserted by both test suites. If you change validation rules here,
 * change them in the probe and re-copy the fixture, or the two will drift and the visitor will be
 * told a domain is fine that the probe then rejects.
 *
 * Nothing here may import from `node:` — this module runs in the browser.
 */

/** Hard cap on the raw pasted blob, applied before anything else touches it. */
export const RAW_INPUT_MAX_CHARS = 2000;

/** Per-label and total length limits from the DNS specification. */
const MAX_LABEL_LENGTH = 63;
const MAX_DOMAIN_LENGTH = 253;

/** The allowlist. Nothing outside this can survive normalisation. */
const DOMAIN_PATTERN =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

/**
 * Names that must never be probed, because resolving them reaches inside our own network or a
 * cloud provider's metadata service rather than the public internet. This is not about protecting
 * the visitor from a typo — it is about refusing to be used as a request forwarder.
 */
const FORBIDDEN_SUFFIXES = [
  '.local',
  '.localhost',
  '.internal',
  '.localdomain',
  '.home.arpa',
  '.in-addr.arpa',
  '.ip6.arpa',
  '.onion',
  '.test',
  '.invalid',
  '.example',
];

const FORBIDDEN_EXACT = new Set(['localhost', 'local', 'metadata.google.internal']);

export type RejectionReason =
  | 'too-long'
  | 'not-a-domain'
  | 'ip-address'
  | 'single-label'
  | 'reserved-name'
  | 'label-too-long';

export interface Rejection {
  input: string;
  reason: RejectionReason;
}

export interface NormaliseResult {
  /** Deduplicated, validated, lower-cased registrable hostnames, in first-seen order. */
  domains: string[];
  /** Rejected entries, with a machine-readable reason. The client authors the sentence. */
  rejected: Rejection[];
  /** How many entries the raw input contained before deduplication. */
  submitted: number;
  /** True when the raw blob exceeded the CHARACTER cap and was cut before parsing. */
  truncated: boolean;
  /**
   * How many valid, deduplicated domains were dropped for exceeding the per-batch limit.
   *
   * Distinct from `truncated`, and deliberately not folded into it: "your paste was too long so we
   * cut the text" and "you gave us 40 domains and we check 15" are different things to tell a
   * visitor, and only the second one is the documented product limit. Without this the cap is
   * silent — 40 domains in, 15 rows out, and nothing in the response says why the other 25
   * vanished. "15 domains" can only be an honest promise if we say when it binds.
   */
  overCap: number;
}

/** Bare IPv4 / IPv6 literals — a public domain tool has no business resolving these. */
function looksLikeIpAddress(value: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return true;
  if (value.includes(':')) return true;
  return false;
}

function classify(candidate: string): RejectionReason | null {
  if (candidate.length > MAX_DOMAIN_LENGTH) return 'too-long';
  if (looksLikeIpAddress(candidate)) return 'ip-address';

  // Reserved names are classified BEFORE the shape checks. `localhost` is both single-label and
  // reserved; reporting it as "single-label" would invite the visitor to try `localhost.local`,
  // which is the thing we are actually refusing. The more specific reason is the useful one.
  if (FORBIDDEN_EXACT.has(candidate)) return 'reserved-name';
  if (FORBIDDEN_SUFFIXES.some((suffix) => candidate.endsWith(suffix))) return 'reserved-name';

  if (!candidate.includes('.')) return 'single-label';
  if (candidate.split('.').some((label) => label.length > MAX_LABEL_LENGTH)) return 'label-too-long';
  if (!DOMAIN_PATTERN.test(candidate)) return 'not-a-domain';
  return null;
}

/**
 * Strips the shapes people actually paste: a full URL, a `user@domain` address, a trailing dot,
 * surrounding whitespace and punctuation, a `www.` prefix. Everything here is removal — nothing
 * is substituted, so no step can introduce a character the allowlist would have rejected.
 */
function strip(raw: string): string {
  let value = raw.trim().toLowerCase();

  // A pasted URL: take the host.
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  const slash = value.indexOf('/');
  if (slash !== -1) value = value.slice(0, slash);

  // An email address: take the domain.
  const at = value.lastIndexOf('@');
  if (at !== -1) value = value.slice(at + 1);

  // A port, a trailing root dot, wrapping punctuation.
  const colon = value.indexOf(':');
  if (colon !== -1 && !value.includes('::')) value = value.slice(0, colon);
  value = value.replace(/^[<("'[]+|[>)"'\].,;]+$/g, '');
  value = value.replace(/\.+$/, '');

  if (value.startsWith('www.') && value.split('.').length > 2) value = value.slice(4);

  return value;
}

/**
 * The eight steps, in order: cap the raw blob, split, strip, lower-case, reject by allowlist,
 * deduplicate, preserve first-seen order, and report counts rather than the list itself.
 */
export function normalise(raw: string, maxDomains: number): NormaliseResult {
  const truncated = raw.length > RAW_INPUT_MAX_CHARS;
  const capped = truncated ? raw.slice(0, RAW_INPUT_MAX_CHARS) : raw;

  const entries = capped
    .split(/[\s,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const domains: string[] = [];
  const rejected: Rejection[] = [];
  const seen = new Set<string>();
  let overCap = 0;

  for (const entry of entries) {
    const candidate = strip(entry);
    if (!candidate) continue;

    const reason = classify(candidate);
    if (reason) {
      rejected.push({ input: entry.slice(0, 64), reason });
      continue;
    }

    if (seen.has(candidate)) continue;
    seen.add(candidate);

    // Counted, not silently dropped. The cap is counted AFTER deduplication so pasting the same
    // domain twenty times costs one slot, not twenty.
    if (domains.length < maxDomains) domains.push(candidate);
    else overCap += 1;
  }

  return { domains, rejected, submitted: entries.length, truncated, overCap };
}

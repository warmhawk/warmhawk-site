/**
 * The /errors bounce-code dictionary — one entry per page under /errors/<slug>, plus the lookup
 * table the "paste your bounce" decoder (lib/bounceDecoder.ts) searches.
 *
 * Every `variants[].text` is quoted verbatim from the provider's own documentation (the entry's
 * `sources`), checked 2026-09-29 — never paraphrased, never collected from forum posts. A code
 * that couldn't be verified against an official source (Yahoo's TSS* family, for example: Yahoo's
 * own Sender Hub doesn't list them individually) is left out rather than guessed at.
 *
 * Temporary (4.x.x) and permanent (5.x.x) forms of the same check share one page: `aliases`
 * routes the other form here, and `ranges` covers Microsoft's documented code ranges.
 */

export type ErrorProvider = 'gmail' | 'microsoft' | 'outlook-com' | 'rfc';

export type ErrorCategory =
  | 'authentication'
  | 'reputation'
  | 'rate-limit'
  | 'recipient'
  | 'account'
  | 'transport';

export type CheckerKey = 'spf' | 'dkim' | 'dmarc' | 'mx' | 'blacklist' | 'domain';

export interface ErrorVariant {
  provider: ErrorProvider;
  /** The full reply as the provider documents it, e.g. "550 5.7.26". */
  reply: string;
  /** Verbatim message text from the provider's documentation. */
  text: string;
}

export interface ErrorSource {
  label: string;
  url: string;
}

export interface SmtpErrorEntry {
  slug: string;
  /** The code the page is titled by, e.g. "5.7.26". */
  code: string;
  /** Other enhanced status codes that resolve to this page. */
  aliases: string[];
  /** Inclusive code ranges (same class and subject) that resolve to this page. */
  ranges?: ReadonlyArray<readonly [string, string]>;
  /** Short plain-English name, used in titles and the hub list. */
  headline: string;
  category: ErrorCategory;
  permanence: 'permanent' | 'temporary' | 'both';
  /** 40–60 word direct answer (rendered in an AnswerBlock). */
  summary: string;
  variants: ErrorVariant[];
  causes: string[];
  fixes: string[];
  /** What this bounce means specifically for someone running cold outreach. */
  coldEmail: string;
  checks: CheckerKey[];
  sources: ErrorSource[];
  related: string[];
  /** A first-hand account of WarmHawk hitting this code itself, rendered as "Real experience". */
  experience?: { title: string; paragraphs: string[] };
}

export const errorCategoryLabels: Record<ErrorCategory, string> = {
  authentication: 'Authentication (SPF, DKIM, DMARC, PTR)',
  reputation: 'Reputation, blocks and bans',
  'rate-limit': 'Rate limits and throttling',
  recipient: 'Recipient address and mailbox problems',
  account: 'Your account, tenant or relay setup',
  transport: 'TLS and delivery transport',
};

/**
 * "How WarmHawk handles it", one paragraph per category, shown on every code page in it. Each
 * sentence describes behavior that exists in warmhawk-core-engine today (checked 2026-09-29):
 * the bounce circuit breaker (lib/mailSender.ts + constants.ts: 5% over at least 20 sends), the
 * warmup policy (lib/warmup/policy.ts: graduate at day 14 and a 90% 7-day inbox rate, demote
 * below 70%, then 5 campaign sends a day growing 20%), the worker's 8-minute cadence floor
 * (computeNextSlotSeconds.ts), soft-failure retries (30 minutes doubling, suppressed after 4),
 * the hourly blocklist poll and the "needs reconnect" flag. Re-check them before editing.
 */
export const warmhawkGuardrails: Record<ErrorCategory, string> = {
  authentication:
    'WarmHawk checks SPF, DKIM and DMARC for each sending domain against live DNS and keeps "could not check" separate from "failed", so a flaky resolver never looks like a broken record. New mailboxes warm up by sending to partner inboxes and recording where each email landed, so an authentication problem shows up in the warmup results before the mailbox graduates to campaigns.',
  reputation:
    'WarmHawk pauses a mailbox on its own once its hard-bounce rate passes 5% over at least 20 sends, and pauses a campaign at that campaign’s own bounce threshold, so a bad list stops before it drags the domain down. Every sending domain is re-checked against DNS blocklists hourly, and a mailbox only reaches campaign volume after at least 14 days of warmup with a 90% inbox rate. A mailbox whose inbox rate falls below 70% goes back to warmup.',
  'rate-limit':
    'WarmHawk never sends more than a mailbox’s own daily cap, spaces sends from one mailbox at least 8 minutes apart with random jitter, and starts a newly warmed mailbox at 5 campaign emails a day, growing 20% a day. A temporary failure is retried with backoff (30 minutes, then doubling) and the lead is suppressed after 4 attempts, so a throttled mailbox is never hammered.',
  recipient:
    'A hard bounce marks that lead as bounced and stops its sequence, and every bounce counts toward the mailbox’s bounce-rate breaker: at 5% over at least 20 sends, WarmHawk pauses the mailbox before a stale list can damage the domain.',
  account:
    'WarmHawk sends through your own Google Workspace or Microsoft 365 mailboxes. When the provider stops accepting a mailbox’s sign-in (approval removed, password reset, no Exchange Online license), WarmHawk marks that mailbox as needing a reconnect and says why, instead of showing it as connected while every send fails.',
  transport:
    'A Google Workspace or Microsoft 365 mailbox connected to WarmHawk sends through the provider’s own servers, which already use TLS. A temporary failure is retried with backoff (30 minutes, then doubling, capped at 48 hours) and the lead is suppressed after 4 attempts instead of being retried forever.',
};

export const errorProviderLabels: Record<ErrorProvider, string> = {
  gmail: 'Gmail / Google Workspace',
  microsoft: 'Microsoft 365 / Exchange Online',
  'outlook-com': 'Outlook.com / Hotmail',
  rfc: 'Any mail server (RFC standard meaning)',
};

export const checkerLinks: Record<CheckerKey, { href: string; label: string }> = {
  spf: { href: '/tools/spf-checker', label: 'SPF record checker' },
  dkim: { href: '/tools/dkim-checker', label: 'DKIM checker' },
  dmarc: { href: '/tools/dmarc-checker', label: 'DMARC checker' },
  mx: { href: '/tools/mx-checker', label: 'MX record checker' },
  blacklist: { href: '/tools/blacklist-checker', label: 'Email blacklist checker' },
  domain: { href: '/tools/domain-check', label: 'Full domain health check' },
};

/** The date every quoted message and source link below was last checked. */
export const ERRORS_VERIFIED_ON = '2026-09-29';

const GMAIL: ErrorSource = {
  label: 'Google Workspace: Gmail SMTP errors and codes',
  url: 'https://knowledge.workspace.google.com/admin/support/troubleshooting/gmail-smtp-errors-and-codes',
};
const GMAIL_SENDER_GUIDELINES: ErrorSource = {
  label: 'Google: Email sender guidelines',
  url: 'https://support.google.com/a/answer/81126',
};
const MS_NDR: ErrorSource = {
  label: 'Microsoft Learn: NDRs and SMTP errors in Exchange Online',
  url: 'https://learn.microsoft.com/en-us/exchange/mail-flow-best-practices/non-delivery-reports-in-exchange-online/non-delivery-reports-in-exchange-online',
};
const MS_DELIST: ErrorSource = {
  label: 'Microsoft Learn: Use the delist portal',
  url: 'https://learn.microsoft.com/en-us/defender-office-365/use-the-delist-portal-to-remove-yourself-from-the-office-365-blocked-senders-lis',
};
const MS_LIMITS: ErrorSource = {
  label: 'Microsoft Learn: Exchange Online sending limits',
  url: 'https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits#sending-limits',
};
const MS_SMTP_AUTH: ErrorSource = {
  label: 'Microsoft Learn: Enable or disable SMTP AUTH in Exchange Online',
  url: 'https://learn.microsoft.com/en-us/exchange/clients-and-mobile-in-exchange-online/authenticated-client-smtp-submission',
};
const OUTLOOK_515: ErrorSource = {
  label: 'Microsoft Support: Fix NDR error 550 5.7.515 in Outlook.com',
  url: 'https://support.microsoft.com/en-us/outlook/fix-ndr-error-550-5-7-515-in-outlook-com',
};
const MS_5_7_700: ErrorSource = {
  label: 'Microsoft Learn: Fix error codes 5.7.700 through 5.7.750',
  url: 'https://learn.microsoft.com/en-us/exchange/mail-flow-best-practices/non-delivery-reports-in-exchange-online/fix-error-code-5-7-700-through-5-7-750',
};
const RFC_3463: ErrorSource = {
  label: 'RFC 3463: Enhanced Mail System Status Codes',
  url: 'https://www.rfc-editor.org/rfc/rfc3463',
};
const RFC_6647: ErrorSource = {
  label: 'RFC 6647: Email Greylisting',
  url: 'https://www.rfc-editor.org/rfc/rfc6647',
};

export const smtpErrors: SmtpErrorEntry[] = [
  // ─── Authentication ──────────────────────────────────────────────────────────────────────────
  {
    slug: '5-7-26',
    code: '5.7.26',
    aliases: ['4.7.26'],
    headline: 'Unauthenticated sender (no SPF or DKIM pass)',
    category: 'authentication',
    permanence: 'both',
    summary:
      'Gmail returns 5.7.26 when a message passes neither SPF nor DKIM, so Google cannot tell who actually sent it. The 421 4.7.26 form rate-limits you first; 550 5.7.26 blocks outright. Fix it by publishing an SPF record that covers your sending service and signing every message with DKIM.',
    variants: [
      {
        provider: 'gmail',
        reply: '550 5.7.26',
        text: 'This email has been blocked because the sender is unauthenticated. Gmail requires all senders to authenticate with either SPF or DKIM.',
      },
      {
        provider: 'gmail',
        reply: '421 4.7.26',
        text: 'This email has been rate limited because it is unauthenticated. Gmail requires all senders to authenticate with either SPF or DKIM.',
      },
      {
        provider: 'gmail',
        reply: '451 4.7.26',
        text: "Unauthenticated email from domain-name is not accepted due to domain's DMARC policy, but temporary DNS failures prevent authentication. Please contact the administrator of domain-name domain if this was a legitimate email.",
      },
      {
        provider: 'microsoft',
        reply: '4.7.26',
        text: 'Access denied, a message sent over IPv6 [2a01:111:f200:2004::240] must pass either SPF or DKIM validation, this message is not signed',
      },
    ],
    causes: [
      'No SPF record on the sending domain, or one that does not include the server or service that actually sent the message.',
      'No DKIM signature, or a DKIM key published under a selector your sender is not using.',
      'A new sending tool was added (a cold email platform, a CRM, a helpdesk) without updating SPF or setting up its DKIM.',
      'The SPF record exceeds 10 DNS lookups, so receivers treat it as a permanent error rather than a pass.',
    ],
    fixes: [
      'Check the domain with an SPF checker and confirm the sending service is included and the lookup count is 10 or under.',
      'Turn on DKIM signing in the sending platform (Google Workspace and Microsoft 365 both require you to enable it) and publish the key it gives you.',
      'Send a test to a Gmail address and read "Show original": SPF and DKIM should both say PASS.',
      'Resend only after both pass; retrying unauthenticated mail keeps the domain on the rate-limited path.',
    ],
    coldEmail:
      'Every cold email domain needs SPF and DKIM before the first send, including the fresh lookalike domains bought for outreach. Setting up the mailbox but forgetting DKIM is the single most common reason a brand-new domain hits 5.7.26 on day one.',
    checks: ['spf', 'dkim', 'domain'],
    sources: [GMAIL, GMAIL_SENDER_GUIDELINES, MS_NDR],
    related: ['5-7-27', '5-7-30', '5-7-40', '5-7-32'],
  },
  {
    slug: '5-7-27',
    code: '5.7.27',
    aliases: ['4.7.27'],
    headline: 'SPF authentication failed',
    category: 'authentication',
    permanence: 'both',
    summary:
      'Gmail returns 5.7.27 when a message fails SPF: the server that sent it is not listed in the sending domain’s SPF record. The 421 4.7.27 form rate-limits delivery; 550 5.7.27 blocks it. Add the sending server or service to SPF, keep the record under 10 lookups, and resend.',
    variants: [
      {
        provider: 'gmail',
        reply: '550 5.7.27',
        text: "This message was blocked because it didn't pass SPF authentication.",
      },
      {
        provider: 'gmail',
        reply: '421 4.7.27',
        text: "Your email has been rate limited because SPF authentication didn't pass for this message.",
      },
    ],
    causes: [
      'The sending IP or service is missing from the SPF record (an include: was never added).',
      'The domain has two SPF TXT records; receivers treat that as an error and SPF fails.',
      'The record goes over the 10-DNS-lookup limit, so evaluation stops with a permanent error.',
      'Mail is being forwarded, so the forwarding server’s IP is checked against your record.',
    ],
    fixes: [
      'Run an SPF check and add the missing include: for your email provider or cold email tool.',
      'Merge duplicate SPF records into a single v=spf1 record.',
      'Remove unused includes or flatten nested ones until the lookup count is 10 or fewer.',
      'Make sure DKIM also passes, so a forwarded message can still authenticate through DKIM.',
    ],
    coldEmail:
      'Cold email setups often mix a mailbox provider with a sending or warmup tool that connects over SMTP. If the tool relays through its own servers instead of your mailbox provider, those servers must be in your SPF record too.',
    checks: ['spf', 'domain'],
    sources: [GMAIL, GMAIL_SENDER_GUIDELINES],
    related: ['5-7-26', '5-7-24', '5-7-23'],
  },
  {
    slug: '5-7-30',
    code: '5.7.30',
    aliases: ['4.7.30'],
    headline: 'DKIM authentication failed',
    category: 'authentication',
    permanence: 'both',
    summary:
      'Gmail returns 5.7.30 when a message’s DKIM signature does not verify. Either the public key is missing from DNS, it does not match the private key that signed the mail, or the message was altered after signing. The 421 4.7.30 form rate-limits; 550 5.7.30 blocks.',
    variants: [
      {
        provider: 'gmail',
        reply: '550 5.7.30',
        text: "This message was blocked because it didn't pass DKIM authentication.",
      },
      {
        provider: 'gmail',
        reply: '421 4.7.30',
        text: "Your email has been rate limited because DKIM authentication didn't pass for this message.",
      },
    ],
    causes: [
      'The DKIM TXT record is missing at <selector>._domainkey.<domain>, or was pasted with a line break or stray quote.',
      'DKIM was generated in the email provider but signing was never switched on.',
      'The key was rotated in the provider without publishing the new public key.',
      'A gateway, footer or tracking tool rewrote the body or signed headers after DKIM signing.',
    ],
    fixes: [
      'Look up the selector your provider signs with (in the DKIM-Signature header, s=) and check that exact record.',
      'Re-copy the public key from the provider into DNS as a single TXT value, then start signing.',
      'Send a test to Gmail and confirm "DKIM: PASS" in Show original.',
      'If a relay modifies messages, sign after that relay, not before it.',
    ],
    coldEmail:
      'Link-tracking and open-tracking tools that rewrite the message after your mailbox provider signs it can break DKIM. If only tracked campaigns fail, test the same message with tracking off.',
    checks: ['dkim', 'domain'],
    sources: [GMAIL, GMAIL_SENDER_GUIDELINES],
    related: ['5-7-26', '5-7-27', '5-7-32'],
  },
  {
    slug: '5-7-40',
    code: '5.7.40',
    aliases: ['4.7.40'],
    headline: 'No DMARC record, or no DMARC policy',
    category: 'authentication',
    permanence: 'both',
    summary:
      'Gmail returns 5.7.40 when the sending domain has no DMARC record, or the record has no valid policy tag. Google requires DMARC from bulk senders. Publish a TXT record at _dmarc.yourdomain with at least v=DMARC1; p=none, then move to quarantine or reject once reports look clean.',
    variants: [
      {
        provider: 'gmail',
        reply: '550 5.7.40',
        text: "Your message was blocked because the sending domain doesn't have a DMARC record or the DMARC record doesn't specify a DMARC policy.",
      },
      {
        provider: 'gmail',
        reply: '421 4.7.40',
        text: "Your email has been rate limited because the sending domain doesn't have a DMARC record, or the DMARC record doesn't specify a DMARC policy.",
      },
    ],
    causes: [
      'No TXT record exists at _dmarc.<your domain>.',
      'The record exists but is missing the p= tag, or has a typo such as "v=DMARC 1" or "p=nothing".',
      'The DMARC record was published on the wrong host, for example on the root domain instead of _dmarc.',
    ],
    fixes: [
      'Publish v=DMARC1; p=none; rua=mailto:<an address you read> at _dmarc.<domain>.',
      'Check it with a DMARC checker to confirm the tags parse.',
      'After a week or two of clean aggregate reports, tighten to p=quarantine, then p=reject.',
    ],
    coldEmail:
      'Every outreach domain needs its own DMARC record; a record on your main domain does not cover separately registered lookalike domains. Subdomains inherit the parent’s policy, but new domains inherit nothing.',
    checks: ['dmarc', 'domain'],
    sources: [GMAIL, GMAIL_SENDER_GUIDELINES],
    related: ['5-7-32', '5-7-509', '5-7-515'],
  },
  {
    slug: '5-7-32',
    code: '5.7.32',
    aliases: ['4.7.32'],
    headline: 'From: domain not aligned with SPF or DKIM',
    category: 'authentication',
    permanence: 'both',
    summary:
      'Gmail returns 5.7.32 when SPF or DKIM passed, but for a different domain than the one in the visible From: address. DMARC needs at least one of them to align with the From: domain. Sign DKIM with your own domain and use a custom return-path on your sending service.',
    variants: [
      {
        provider: 'gmail',
        reply: '421 5.7.32',
        text: "Your email was blocked because the From: header (RFC5322) in this message isn't aligned with either the authenticated SPF or DKIM organizational domain.",
      },
      {
        provider: 'gmail',
        reply: '421 4.7.32',
        text: "Your email has been rate limited because the From: header (RFC5322) in this message isn't aligned with either the authenticated SPF or DKIM organizational domain.",
      },
    ],
    causes: [
      'A sending service signs DKIM with its own domain (d=theirservice.com) instead of yours.',
      'The envelope sender (return-path) belongs to the sending service, so SPF passes for their domain, not yours.',
      'You send "From: you@yourbrand.com" through a mailbox on a different domain.',
    ],
    fixes: [
      'Set up custom DKIM in the sending service so signatures use d=yourdomain.',
      'Configure a custom return-path (bounce domain) on your domain if the service offers it.',
      'Send each From: address through a mailbox on that same domain.',
    ],
    coldEmail:
      'Sending "From: name@brand.com" through a mailbox that actually lives on an outreach domain fails alignment every time. Keep the From: address and the mailbox on the same domain.',
    checks: ['dkim', 'spf', 'dmarc'],
    sources: [GMAIL],
    related: ['5-7-40', '5-7-509', '5-7-30'],
  },
  {
    slug: '5-7-24',
    code: '5.7.24',
    aliases: ['4.7.24'],
    headline: 'Suspicious entries in your SPF record',
    category: 'authentication',
    permanence: 'both',
    summary:
      'Gmail returns 5.7.24 (or 451 4.7.24) when the sending domain’s SPF record contains entries it considers suspicious. Google does not list which entries, so audit the record: remove over-broad IP ranges, +all, and includes for services you no longer use, and keep it to one record.',
    variants: [
      {
        provider: 'gmail',
        reply: '550 5.7.24',
        text: 'The SPF record of the sending domain has one or more suspicious entries.',
      },
      {
        provider: 'gmail',
        reply: '451 4.7.24',
        text: 'The SPF record of the sending domain has one or more suspicious entries.',
      },
    ],
    causes: [
      'The record ends in +all, which authorizes every server on the internet.',
      'Very wide IP ranges (for example a /8 or /16) that authorize far more than your real senders.',
      'Leftover includes for tools you stopped using, or entries copied from a template.',
    ],
    fixes: [
      'Replace +all or ?all with ~all or -all.',
      'Narrow ip4:/ip6: ranges to the specific addresses your mail actually leaves from.',
      'Remove includes for services that no longer send for you, then re-check the record.',
    ],
    coldEmail:
      'Guides that tell you to "just add +all so nothing fails" cause exactly this. An SPF record should list only the services that really send your mail.',
    checks: ['spf'],
    sources: [GMAIL],
    related: ['5-7-27', '5-7-26'],
  },
  {
    slug: '5-7-25',
    code: '5.7.25',
    aliases: ['4.7.23'],
    headline: 'Sending IP has no reverse DNS (PTR) record',
    category: 'authentication',
    permanence: 'both',
    summary:
      'Gmail returns 5.7.25 when the sending IP has no PTR (reverse DNS) record, or the hostname it points to does not resolve back to that IP. The temporary form is 451 4.7.23. Only whoever controls the IP can set PTR: your hosting provider or the mail service you send through.',
    variants: [
      {
        provider: 'gmail',
        reply: '550 5.7.25',
        text: "This message was blocked because the sending IP address doesn't have a PTR record, or the forwarding DNS entry doesn't reference the sending IP address.",
      },
      {
        provider: 'gmail',
        reply: '451 4.7.23',
        text: "The sending IP address for this message doesn't have a PTR record, or the PTR record's forward DNS entry doesn't match the sending IP address.",
      },
      {
        provider: 'microsoft',
        reply: '5.7.25',
        text: 'Access denied, the sending IPv6 address [2a01:111:f200:2004::240] must have a reverse DNS record',
      },
    ],
    causes: [
      'Mail is sent straight from a VPS or home server whose IP has no PTR record.',
      'The PTR record points to a hostname whose A or AAAA record does not point back to the same IP.',
      'The server started sending over IPv6, and the IPv6 address has no reverse DNS.',
    ],
    fixes: [
      'Set a PTR record for the sending IP in your hosting provider’s control panel (for example mail.yourdomain.com).',
      'Create a matching A (or AAAA) record so the forward and reverse lookups agree.',
      'If you cannot set PTR on IPv6, force the mail server to send over IPv4.',
    ],
    coldEmail:
      'This mostly hits self-hosted senders. If you send through Google Workspace or Microsoft 365 mailboxes, their IPs already have PTR records, and seeing this code means something is relaying mail outside them.',
    checks: ['mx', 'domain'],
    sources: [GMAIL, MS_NDR],
    related: ['4-7-0', '5-7-26'],
  },
  {
    slug: '5-7-23',
    code: '5.7.23',
    aliases: [],
    headline: 'Rejected for an SPF violation (Microsoft)',
    category: 'authentication',
    permanence: 'permanent',
    summary:
      'Exchange Online returns 5.7.23 when the receiving organization validates SPF and your message failed it. In practice the server that sent your mail is not authorized in your domain’s SPF record, or the record is broken. Fix SPF on the sending domain; the recipient cannot fix this for you.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.23',
        text: 'The message was rejected because of Sender Policy Framework violation',
      },
    ],
    causes: [
      'The sending server is not listed in the SPF record.',
      'The SPF record uses -all and the message came from an unlisted source.',
      'Duplicate SPF records or too many DNS lookups make SPF evaluation fail.',
    ],
    fixes: [
      'Check the domain’s SPF record and add the missing sender.',
      'Keep a single SPF record and 10 or fewer DNS lookups.',
      'Make sure DKIM also passes, so DMARC can still pass if SPF breaks on forwarding.',
    ],
    coldEmail:
      'When one prospect’s Microsoft 365 tenant rejects you with 5.7.23 and others do not, the recipient has a stricter SPF rule. Your record is still the thing to fix.',
    checks: ['spf', 'domain'],
    sources: [MS_NDR],
    related: ['5-7-27', '5-7-509'],
  },
  {
    slug: '5-7-509',
    code: '5.7.509',
    aliases: [],
    headline: 'DMARC failed and the policy is reject (Microsoft)',
    category: 'authentication',
    permanence: 'permanent',
    summary:
      'Microsoft returns 5.7.509 when the domain in your From: address fails DMARC and that domain publishes p=reject, so Microsoft honours the policy and rejects the message. Either SPF or DKIM must pass and align with the From: domain. Fix alignment; do not loosen the policy as the fix.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.509',
        text: 'Access denied, sending domain [$SenderDomain] does not pass DMARC verification and has a DMARC policy of reject.',
      },
    ],
    causes: [
      'A third-party sending tool sends as your domain without DKIM signing for your domain.',
      'SPF passes only for the tool’s own bounce domain, so it does not align with your From: domain.',
      'Someone else is spoofing your domain, and DMARC is correctly stopping them.',
    ],
    fixes: [
      'Set up DKIM for your domain in every service that sends as you.',
      'Confirm in a message header that dkim=pass header.d= matches your From: domain.',
      'Read your DMARC aggregate reports to find which sources are failing.',
    ],
    coldEmail:
      'Setting p=reject on a new outreach domain before DKIM is working will bounce every Microsoft-hosted prospect. Start at p=none, confirm alignment, then tighten.',
    checks: ['dmarc', 'dkim', 'spf'],
    sources: [MS_NDR],
    related: ['5-7-32', '5-7-40', '5-7-515'],
  },
  {
    slug: '5-7-515',
    code: '5.7.515',
    aliases: [],
    headline: 'High-volume sender fails Outlook.com authentication requirements',
    category: 'authentication',
    permanence: 'permanent',
    summary:
      'Outlook.com returns 5.7.515 when a domain sending 5,000 or more messages to Microsoft consumer mailboxes does not meet its authentication bar: SPF and DKIM must both pass, a DMARC record must exist, and at least one of SPF or DKIM must align with the From: domain.',
    variants: [
      {
        provider: 'outlook-com',
        reply: '550 5.7.515',
        text: 'Access denied, sending domain <domain> does not meet the required authentication level.',
      },
    ],
    causes: [
      'DKIM is missing or failing while SPF passes; Outlook.com requires both to pass.',
      'No DMARC record, or a DMARC record without a valid p= policy.',
      'Neither SPF nor DKIM aligns with the domain in the From: address.',
    ],
    fixes: [
      'Publish SPF and DKIM, and confirm both pass in a test message header.',
      'Publish a DMARC record with at least p=none.',
      'Make sure DKIM signs with the From: domain, or the return-path uses it.',
    ],
    coldEmail:
      'The 5,000-message threshold counts all mail to Hotmail, Outlook.com and Live addresses from the same From: domain. Spreading volume across several properly authenticated domains is normal; spreading it across unauthenticated ones is not a workaround.',
    checks: ['spf', 'dkim', 'dmarc'],
    sources: [OUTLOOK_515],
    related: ['5-7-509', '5-7-40', '5-7-26'],
  },
  {
    slug: '5-7-512',
    code: '5.7.512',
    aliases: [],
    headline: 'Missing or invalid From: header',
    category: 'authentication',
    permanence: 'permanent',
    summary:
      'Microsoft 365 returns 5.7.512 when a message has no valid address in its From: header, as RFC 5322 section 3.6.2 requires. Gmail rejects the same problem under 550 5.7.1. It usually comes from a script or app that builds its own headers. Send a properly formatted From: with angle brackets.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.512',
        text: 'Access denied, message must be RFC 5322 section 3.6.2 compliant',
      },
    ],
    causes: [
      'A script or app sets From: to a bare name with no address.',
      'The From: address is malformed, for example missing the domain part.',
      'The From: header is missing entirely because only the envelope sender was set.',
    ],
    fixes: [
      'Set From: as "Display Name <user@yourdomain.com>".',
      'Check the raw message source to confirm exactly one From: header with one address.',
    ],
    coldEmail:
      'Custom sending scripts and mail-merge tools are the usual cause. Mailbox-connected tools that send through Gmail or Outlook set From: correctly.',
    checks: ['domain'],
    sources: [MS_NDR, GMAIL],
    related: ['5-7-1', '5-7-32'],
  },

  // ─── Reputation, blocks and bans ─────────────────────────────────────────────────────────────
  {
    slug: '5-7-28',
    code: '5.7.28',
    aliases: ['4.7.28'],
    headline: 'Unusual rate of unsolicited mail',
    category: 'reputation',
    permanence: 'both',
    summary:
      'Gmail returns 4.7.28 when it sees an unusual rate of unsolicited mail from your IP, netblock, DKIM domain, SPF domain or a URL domain in your messages, and 5.7.28 when it blocks that IP. It is a volume-and-complaints signal, not a DNS error: slow down and fix what recipients are reporting.',
    variants: [
      {
        provider: 'gmail',
        reply: '550 5.7.28',
        text: 'There is an unusual rate of unsolicited email originating from your IP address has been blocked.',
      },
      {
        provider: 'gmail',
        reply: '421 4.7.28',
        text: 'Gmail has detected an unusual rate of unsolicited email originating from your DKIM domain.',
      },
      {
        provider: 'gmail',
        reply: '421 4.7.28',
        text: 'Gmail has detected an unusual rate of unsolicited email originating from your SPF domain.',
      },
      {
        provider: 'gmail',
        reply: '421 4.7.28',
        text: 'Gmail has detected an unusual rate of unsolicited email containing one of your URL domains.',
      },
      {
        provider: 'gmail',
        reply: '421 4.7.28',
        text: 'Gmail has detected an unusual rate of unsolicited email originating from your IP Netblock.',
      },
      {
        provider: 'gmail',
        reply: '421 4.7.28',
        text: 'Gmail has detected this sender exceeded the quota for sending messages that have the same Message-ID:.',
      },
    ],
    causes: [
      'A sudden jump in volume from a domain or mailbox with little sending history.',
      'Recipients marking the mail as spam.',
      'A link domain in your messages (a shared tracking domain or URL shortener) with poor reputation.',
      'The same message sent many times with an identical Message-ID.',
    ],
    fixes: [
      'Cut volume immediately and ramp back up gradually once deferrals stop.',
      'Check Google Postmaster Tools for spam rate and domain reputation.',
      'Use your own custom tracking domain rather than a shared one, or turn link tracking off.',
      'Remove recipients who never engage and anyone who complained.',
    ],
    coldEmail:
      'This is the classic "new domain, full volume on day one" bounce. New mailboxes need a gradual ramp, a small daily cap per mailbox, and lists that are verified before sending.',
    checks: ['blacklist', 'domain'],
    sources: [GMAIL, GMAIL_SENDER_GUIDELINES],
    related: ['4-7-0', '5-7-1', '4-2-1'],
  },
  {
    slug: '4-7-0',
    code: '4.7.0',
    aliases: [],
    headline: 'Temporarily deferred: low reputation, PTR or TLS',
    category: 'reputation',
    permanence: 'temporary',
    summary:
      '4.7.0 is a temporary security or policy deferral. From Gmail it most often means very low sending IP or domain reputation, a missing PTR record, or that the recipient domain requires TLS. The server will retry, but repeated 4.7.0 deferrals that end in a bounce mean the underlying reputation problem needs fixing.',
    variants: [
      {
        provider: 'gmail',
        reply: '421 4.7.0',
        text: 'This message is suspicious due to the very low reputation of the sending IP address.',
      },
      {
        provider: 'gmail',
        reply: '421 4.7.0',
        text: 'This message is suspicious due to the very low reputation of the sending domain.',
      },
      {
        provider: 'gmail',
        reply: '421 4.7.0',
        text: 'The IP address sending this message does not have a PTR record, or the corresponding forward DNS entry does not point to the sending IP.',
      },
      {
        provider: 'gmail',
        reply: '421 4.7.0',
        text: 'TLS required for RCPT domain, closing connection.',
      },
      {
        provider: 'rfc',
        reply: '4.7.0',
        text: 'Other or undefined security status',
      },
    ],
    causes: [
      'Sending IP or domain reputation has dropped after complaints or spam-trap hits.',
      'The sending IP has no reverse DNS.',
      'Your server is not using TLS and the recipient requires it.',
    ],
    fixes: [
      'Check the domain and IP against blocklists and in Google Postmaster Tools.',
      'Reduce volume and send only to engaged, verified recipients until deferrals stop.',
      'Set a PTR record and enable STARTTLS on self-hosted servers.',
    ],
    coldEmail:
      'A run of 4.7.0 deferrals on a cold email mailbox is an early warning. Pause the campaigns on that mailbox before the deferrals turn into 5.7.1 rejections.',
    checks: ['blacklist', 'domain'],
    sources: [GMAIL, RFC_3463],
    related: ['5-7-28', '5-7-1', '5-7-25', '5-7-29'],
  },
  {
    slug: '5-7-1',
    code: '5.7.1',
    aliases: [],
    headline: 'Delivery not authorized, message refused',
    category: 'reputation',
    permanence: 'permanent',
    summary:
      '5.7.1 is the generic "delivery not authorized" rejection. From Gmail it usually means the message looked like spam or came from a very low-reputation IP or domain. From Microsoft 365 it usually means a recipient restriction, a transport rule, or an unauthenticated relay attempt. The text after the code tells you which.',
    variants: [
      {
        provider: 'gmail',
        reply: '550 5.7.1',
        text: 'This message is likely unsolicited email.',
      },
      {
        provider: 'gmail',
        reply: '550 5.7.1',
        text: 'This message is likely suspicious due to the very low reputation of the sending IP address.',
      },
      {
        provider: 'gmail',
        reply: '550 5.7.1',
        text: 'This message is likely suspicious due to the very low reputation of the sending domain.',
      },
      {
        provider: 'gmail',
        reply: '550 5.7.1',
        text: 'The user or domain that you are sending to (or from) has a policy that prohibits the email.',
      },
      {
        provider: 'gmail',
        reply: '550 5.7.1',
        text: 'Messages missing a valid Message-ID: header are not accepted.',
      },
      {
        provider: 'gmail',
        reply: '550 5.7.1',
        text: 'Messages missing a valid address in the From: header, or having no From: header, are not accepted.',
      },
      {
        provider: 'gmail',
        reply: '550 5.7.1',
        text: 'Messages with multiple addresses in the From: header are not accepted.',
      },
      {
        provider: 'microsoft',
        reply: '5.7.1',
        text: 'Delivery not authorized',
      },
      {
        provider: 'microsoft',
        reply: '5.7.1',
        text: 'Unable to relay',
      },
      {
        provider: 'microsoft',
        reply: '5.7.1',
        text: 'Client was not authenticated',
      },
      {
        provider: 'rfc',
        reply: '5.7.1',
        text: 'Delivery not authorized, message refused',
      },
    ],
    causes: [
      'Gmail: spam-like content or a sending domain or IP whose reputation has collapsed.',
      'Microsoft: the recipient (often a distribution group) accepts mail only from approved senders, or a transport rule blocked it.',
      'Microsoft: a server tried to relay through a system that does not accept mail for that domain, or skipped authentication.',
    ],
    fixes: [
      'Read the full text after the code to see which variant you hit.',
      'For reputation variants: stop sending from that domain, check blocklists and Postmaster Tools, and rebuild with low volume.',
      'For relay or authentication variants: authenticate your SMTP connection, or fix the MX record that points at the wrong server.',
    ],
    coldEmail:
      'A Gmail "likely unsolicited email" rejection on outreach is a content-and-reputation verdict. Plain-text messages, no link tracking, verified lists and lower volume are the levers that move it.',
    checks: ['blacklist', 'domain'],
    sources: [GMAIL, MS_NDR, RFC_3463],
    related: ['5-7-28', '4-7-0', '5-7-57', '5-7-512'],
  },
  {
    slug: '5-7-708',
    code: '5.7.708',
    aliases: [],
    headline: 'Access denied, traffic not accepted from this IP',
    category: 'reputation',
    permanence: 'permanent',
    summary:
      'Microsoft 365 returns 5.7.708 when most of the outbound traffic from your tenant has been classified as suspicious, so Microsoft bans the tenant from sending. It is common on new tenants that send cold email at volume. Resolve any compromised accounts or open relays, then contact Microsoft support to lift the ban.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.708',
        text: 'Access denied, traffic not accepted from this IP',
      },
    ],
    causes: [
      'A new Microsoft 365 tenant sending a lot of external mail before it has any reputation.',
      'A compromised account in the tenant sending spam.',
      'High complaint or bounce rates across the tenant’s mailboxes.',
    ],
    fixes: [
      'Check every mailbox in the tenant for compromise; reset credentials and enable MFA.',
      'Stop all bulk and outreach sending from the tenant.',
      'Open a support request with Microsoft through the admin center and ask for an IP address exception; the block is lifted on their side.',
      'When sending resumes, start low and ramp slowly.',
    ],
    coldEmail:
      'Buying a fresh Microsoft 365 tenant and loading dozens of mailboxes into a cold email tool on day one is a common path to 5.7.708. The ban is tenant-wide, so every mailbox in that tenant stops at once.',
    checks: ['blacklist', 'domain'],
    sources: [MS_NDR, MS_5_7_700],
    related: ['5-7-705', '5-7-750', '4-7-500', '5-7-233'],
    experience: {
      title: 'We hit 5.7.708 ourselves',
      paragraphs: [
        'In September 2026 our own warmup started bouncing. A mailbox on a brand-new Microsoft 365 tenant, on a paid Exchange Online license and not a trial, was warming up with a Google Workspace mailbox. Some of its sends came back with 550 5.7.708 Access denied, traffic not accepted from this IP. Others, sent the same day to the same Google-hosted recipients, landed in the inbox.',
        'Nothing on our side was wrong: SPF passed, DKIM was signed and DMARC was published. Microsoft’s message trace showed the failed sends had left through different Microsoft outbound servers than the delivered ones, which matches Microsoft’s own explanation that 5.7.708 comes from low-reputation IP addresses and mostly hits new customers. No DNS change fixes that. The only route is a support ticket asking for an IP address exception, which we opened.',
        'It also exposed a gap in WarmHawk. The bounce notice lands in the sender’s mailbox, but warmup only looked in the recipient’s inbox and spam folders, so it logged those emails as missing. Warmup now reads the sender’s mailbox for the bounce notice, so a 5.7.708 shows up as bounced, with Microsoft’s reason, within about two hours of the send.',
      ],
    },
  },
  {
    slug: '5-7-705',
    code: '5.7.705',
    aliases: [],
    headline: 'Access denied, tenant has exceeded threshold',
    category: 'reputation',
    permanence: 'permanent',
    summary:
      'Microsoft 365 returns 5.7.705 when most of your tenant’s outbound traffic has been detected as suspicious and the tenant has crossed Microsoft’s threshold, so sending is banned tenant-wide. Microsoft documents it alongside 5.7.708 with the same fix: clean up any compromise, then contact Microsoft support.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.705',
        text: 'Access denied, tenant has exceeded threshold',
      },
    ],
    causes: [
      'Outbound spam from compromised accounts in the tenant.',
      'Bulk or outreach volume from a tenant with no sending history.',
    ],
    fixes: [
      'Secure every account: reset passwords, enable MFA, review mailbox forwarding rules.',
      'Stop bulk sending from the tenant until the ban is lifted.',
      'Contact Microsoft support through your normal support channel.',
    ],
    coldEmail:
      'Same root cause as 5.7.708: too much external mail from a tenant Microsoft does not yet trust. Spreading outreach across more mailboxes in the same tenant does not help, because the threshold is per tenant.',
    checks: ['blacklist'],
    sources: [MS_NDR],
    related: ['5-7-708', '5-7-750', '5-1-8'],
  },
  {
    slug: '5-7-750',
    code: '5.7.750',
    aliases: [],
    headline: 'Blocked from sending from unregistered domains',
    category: 'account',
    permanence: 'permanent',
    summary:
      'Microsoft 365 returns 5.7.750 when a suspicious amount of mail from your tenant uses From: domains that are not added and verified in the tenant. Microsoft blocks sending from those unprovisioned domains. Add and validate every domain you send from in the Microsoft 365 admin center.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.750',
        text: 'Service unavailable. Client blocked from sending from unregistered domains',
      },
    ],
    causes: [
      'An app or device sends through your tenant using a From: domain that is not an accepted domain.',
      'Outreach domains are used as From: addresses without being added to the tenant.',
    ],
    fixes: [
      'Add each sending domain under Settings > Domains in the Microsoft 365 admin center and verify it.',
      'Stop sending with From: domains the tenant does not own.',
    ],
    coldEmail:
      'Every outreach domain used from a Microsoft 365 tenant must be added and verified as a domain in that tenant; you cannot send as an arbitrary domain through it.',
    checks: ['domain'],
    sources: [MS_NDR],
    related: ['5-7-708', '5-7-705'],
  },
  {
    slug: '4-7-500',
    code: '4.7.500',
    aliases: [],
    ranges: [
      ['4.7.500', '4.7.699'],
      ['4.7.850', '4.7.899'],
    ],
    headline: 'Access denied, please try again later',
    category: 'reputation',
    permanence: 'temporary',
    summary:
      'Microsoft returns a code between 4.7.500 and 4.7.699 (or 4.7.850 to 4.7.899 for an IP) when it detects suspicious activity and temporarily restricts sending while it evaluates. If the traffic is legitimate, Microsoft says the restriction lifts shortly. Slow down; do not hammer retries.',
    variants: [
      {
        provider: 'microsoft',
        reply: '4.7.500-699',
        text: 'Access denied, please try again later',
      },
      {
        provider: 'microsoft',
        reply: '4.7.850-899',
        text: 'Access denied, please try again later',
      },
    ],
    causes: [
      'A burst of mail from a new IP, domain or tenant.',
      'Content or behaviour that looks like spam to Microsoft’s filters.',
    ],
    fixes: [
      'Let the server retry on its normal schedule, and pause any new volume.',
      'Lower per-mailbox sending rates once mail flows again.',
      'If it persists for days, check the IP against blocklists and Microsoft’s delist portal.',
    ],
    coldEmail:
      'This is Microsoft’s early warning before a ban such as 5.7.606 or 5.7.708. Treat it as a signal to cut volume on that mailbox or IP now.',
    checks: ['blacklist'],
    sources: [MS_NDR],
    related: ['5-7-606', '5-7-708', '4-7-0'],
  },
  {
    slug: '5-7-606',
    code: '5.7.606',
    aliases: [],
    ranges: [['5.7.606', '5.7.649']],
    headline: 'Access denied, banned sending IP',
    category: 'reputation',
    permanence: 'permanent',
    summary:
      'Microsoft returns a code from 5.7.606 to 5.7.649 when the IP you send from is on its blocked senders list. Check that the IP is not compromised or sending bad traffic, then request removal through Microsoft’s self-service delist portal using the IP address from the bounce.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.606-649',
        text: 'Access denied, banned sending IP [IP1.IP2.IP3.IP4]',
      },
    ],
    causes: [
      'The sending IP sent spam, whether from you, a compromised account, or a previous user of a shared or recycled IP.',
      'Sudden high volume from an IP with no history.',
    ],
    fixes: [
      'Confirm the IP from the bounce and check it against public blocklists.',
      'Fix whatever produced the bad traffic.',
      'Submit the IP at Microsoft’s delist portal and follow the confirmation email.',
    ],
    coldEmail:
      'If you send through a shared SMTP relay, the IP may have been banned because of another customer. Mailbox-provider IPs (Google Workspace, Microsoft 365) are rarely the ones banned; self-hosted and relay IPs are.',
    checks: ['blacklist'],
    sources: [MS_NDR, MS_DELIST],
    related: ['5-7-511', '4-7-500', '5-7-513'],
  },
  {
    slug: '5-7-511',
    code: '5.7.511',
    aliases: [],
    headline: 'Access denied, banned sender (IP)',
    category: 'reputation',
    permanence: 'permanent',
    summary:
      'Microsoft returns 5.7.511 when the IP you are sending from has been banned. Unlike the 5.7.606 range, Microsoft’s documented fix is to email delist@microsoft.com with the full NDR code and the IP address, after making sure whatever caused the ban has stopped.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.511',
        text: 'Access denied, banned sender',
      },
    ],
    causes: [
      'Spam or abusive traffic from the sending IP.',
      'A recycled IP that inherited a previous owner’s ban.',
    ],
    fixes: [
      'Stop and investigate any bulk or unexpected traffic from that IP.',
      'Email delist@microsoft.com with the full NDR code and the IP address.',
    ],
    coldEmail:
      'Moving to a different IP without fixing the sending pattern usually gets the new IP banned too.',
    checks: ['blacklist'],
    sources: [MS_NDR, MS_DELIST],
    related: ['5-7-606', '5-7-501'],
  },
  {
    slug: '5-7-501',
    code: '5.7.501',
    aliases: ['5.7.502', '5.7.503', '5.7.800'],
    headline: 'Access denied, spam abuse detected (banned sender)',
    category: 'reputation',
    permanence: 'permanent',
    summary:
      'Microsoft returns 5.7.501, 5.7.502 or 5.7.503 when the sending account itself has been banned for spam activity, and 5.7.800 when the sending domain has been banned. Resolve the cause, reset the account’s credentials, then contact Microsoft support to restore sending.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.501',
        text: 'Access denied, spam abuse detected',
      },
      {
        provider: 'microsoft',
        reply: '5.7.502',
        text: 'Access denied, banned sender',
      },
      {
        provider: 'microsoft',
        reply: '5.7.503',
        text: 'Access denied, banned sender',
      },
      {
        provider: 'microsoft',
        reply: '5.7.800',
        text: 'Access denied, banned sender',
      },
    ],
    causes: [
      'The account was compromised and used to send spam.',
      'The account sent high-volume unsolicited mail that Microsoft classified as spam.',
      'For 5.7.800: the EHLO or sender domain was banned for spam activity.',
    ],
    fixes: [
      'Reset the account’s credentials and check for malicious inbox or forwarding rules.',
      'Stop all bulk sending from the account.',
      'Contact Microsoft support through your regular channel to restore it.',
    ],
    coldEmail:
      'A mailbox banned for spam abuse usually needs to be retired from outreach even after it is restored. Its history stays with it.',
    checks: ['blacklist'],
    sources: [MS_NDR],
    related: ['5-1-8', '5-7-705', '5-7-708'],
  },
  {
    slug: '5-1-8',
    code: '5.1.8',
    aliases: [],
    headline: 'Access denied, bad outbound sender',
    category: 'account',
    permanence: 'permanent',
    summary:
      'Microsoft 365 returns 5.1.8 when your account has been blocked from sending because it sent too much spam. Microsoft says this usually means the account was compromised by phishing or malware. Secure the account first, then an admin must release it from the restricted entities list.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.1.8',
        text: 'Access denied, bad outbound sender',
      },
    ],
    causes: [
      'Compromised credentials used to send spam.',
      'The account exceeded outbound spam thresholds from legitimate but unsolicited volume.',
    ],
    fixes: [
      'Reset the password, revoke sessions and enable MFA.',
      'Remove any forwarding or inbox rules you did not create.',
      'Have an admin release the user in the Microsoft Defender portal (Restricted entities).',
    ],
    coldEmail:
      'Outreach volume from one Microsoft 365 mailbox can trip outbound spam limits without any compromise. Keep per-mailbox daily sends low and spread volume across mailboxes and domains.',
    checks: ['domain'],
    sources: [MS_NDR],
    related: ['5-7-501', '5-1-90', '5-2-2'],
  },
  {
    slug: '5-7-513',
    code: '5.7.513',
    aliases: [],
    headline: 'Your IP is on the recipient’s own block list',
    category: 'reputation',
    permanence: 'permanent',
    summary:
      'Microsoft 365 returns 5.7.513 when the recipient’s organization has added your sending IP to its own custom block list (AS16012607). This is the recipient’s decision, not Microsoft’s, so the delist portal will not help. Only the recipient organization can remove the block.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.513',
        text: 'Service unavailable, Client host [$ConnectingIP] blocked by $recipientDomain using Customer Block list (AS16012607)',
      },
    ],
    causes: ['The recipient’s admin blocked your IP, often after unwanted mail.'],
    fixes: [
      'Stop emailing that organization.',
      'If the block is a mistake, contact the recipient through another channel and ask them to remove it.',
    ],
    coldEmail:
      'A customer block list entry is a clear signal that the organization does not want your mail. Suppress the whole domain in your outreach tool.',
    checks: ['blacklist'],
    sources: [MS_NDR],
    related: ['5-7-606', '5-7-12'],
  },

  // ─── Rate limits and throttling ──────────────────────────────────────────────────────────────
  {
    slug: '4-2-1',
    code: '4.2.1',
    aliases: [],
    headline: 'Recipient is receiving mail too quickly',
    category: 'rate-limit',
    permanence: 'temporary',
    summary:
      'Gmail returns 450 4.2.1 when the recipient mailbox is receiving mail faster than Gmail allows, so it defers your message. This is about the recipient’s inbound rate, not your reputation. Your server should retry later. If it recurs for one address, slow down how often you send to that address.',
    variants: [
      {
        provider: 'gmail',
        reply: '450 4.2.1',
        text: 'The user you are trying to contact is receiving email too quickly.',
      },
      {
        provider: 'gmail',
        reply: '450 4.2.1',
        text: 'The user you are trying to contact is receiving email at a rate that prevents additional messages from being delivered.',
      },
    ],
    causes: [
      'Many messages to the same recipient in a short time, from you or from all senders combined.',
      'An automated system or mail loop flooding the mailbox.',
    ],
    fixes: [
      'Let your server retry on its normal schedule.',
      'Space out messages to the same recipient.',
    ],
    coldEmail:
      'Sequences that fire several follow-ups within minutes to the same person can hit this. Keep follow-ups days apart.',
    checks: [],
    sources: [GMAIL],
    related: ['5-2-1', '5-2-121'],
  },
  {
    slug: '5-2-121',
    code: '5.2.121',
    aliases: ['5.2.122'],
    headline: 'Recipient’s hourly receive limit exceeded',
    category: 'rate-limit',
    permanence: 'permanent',
    summary:
      'Exchange Online returns 5.2.121 when you sent more messages per hour to one Microsoft 365 recipient than it allows from a single sender, and 5.2.122 when that recipient hit its hourly limit from all senders. Wait, then send to that recipient less often.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.2.121',
        text: "Recipient's per hour message receive limit from specific sender exceeded",
      },
      {
        provider: 'microsoft',
        reply: '5.2.122',
        text: "Recipient's per hour message receive limit exceeded",
      },
    ],
    causes: [
      'An automated system sending many messages to one recipient.',
      'A mail loop or notification storm.',
    ],
    fixes: [
      'Wait and resend later.',
      'Reduce how many messages per hour go to that one recipient.',
    ],
    coldEmail:
      'Outreach rarely hits this unless a sequence misfires and sends repeatedly to the same contact. Check for duplicate contacts in the list.',
    checks: [],
    sources: [MS_NDR],
    related: ['4-2-1', '5-2-2'],
  },
  {
    slug: '5-2-2',
    code: '5.2.2',
    aliases: ['4.2.2'],
    headline: 'Mailbox full, or submission quota exceeded',
    category: 'rate-limit',
    permanence: 'both',
    summary:
      '5.2.2 means two different things. From Gmail, the recipient’s inbox is out of storage (452 4.2.2 is the temporary form). From Microsoft 365, it means you exceeded your own sending limit: the recipient or message rate limit on your account. Read the text to tell which side has the problem.',
    variants: [
      {
        provider: 'gmail',
        reply: '552 5.2.2',
        text: "The recipient's inbox is out of storage space and inactive.",
      },
      {
        provider: 'gmail',
        reply: '452 4.2.2',
        text: "The recipient's inbox is out of storage space.",
      },
      {
        provider: 'microsoft',
        reply: '5.2.2',
        text: 'Submission quota exceeded',
      },
      {
        provider: 'rfc',
        reply: '5.2.2',
        text: 'Mailbox full',
      },
    ],
    causes: [
      'Gmail: the recipient’s storage is full, often an abandoned account.',
      'Microsoft: your account exceeded Exchange Online’s recipient or message rate limits.',
      'Microsoft: a compromised account sending spam can also trip this.',
    ],
    fixes: [
      'Gmail full mailbox: remove the address from your list; full and inactive inboxes rarely come back.',
      'Microsoft quota: wait for the rolling window to clear and lower per-mailbox volume.',
      'If you did not send that volume, treat the account as compromised.',
    ],
    coldEmail:
      'A full, inactive Gmail inbox is a sign of a dead address; suppress it. A Microsoft quota bounce means one mailbox is carrying too much volume.',
    checks: [],
    sources: [GMAIL, MS_NDR, MS_LIMITS, RFC_3463],
    related: ['5-1-90', '5-2-1', '5-1-8'],
  },
  {
    slug: '5-1-90',
    code: '5.1.90',
    aliases: [],
    headline: 'Daily recipient limit reached',
    category: 'rate-limit',
    permanence: 'permanent',
    summary:
      'Exchange Online returns 5.1.90 when your account has reached its daily limit for message recipients under Microsoft 365’s sending limits. Sending resumes as the rolling window clears. Microsoft also notes it can mean the account was compromised and is sending spam, so rule that out first.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.1.90',
        text: "Your message can't be sent because you've reached your daily limit for message recipients",
      },
    ],
    causes: [
      'More recipients in the last 24 hours than the account’s recipient rate limit allows.',
      'A compromised account sending spam.',
    ],
    fixes: [
      'Check Sent Items for mail you did not send; if found, secure the account.',
      'Wait for the rolling 24-hour window to clear.',
      'Spread volume across more mailboxes instead of pushing one mailbox to its limit.',
    ],
    coldEmail:
      'Microsoft’s published limits are ceilings, not targets. Cold email mailboxes that run near them draw spam filtering long before they hit this bounce.',
    checks: [],
    sources: [MS_NDR, MS_LIMITS],
    related: ['5-2-2', '5-7-233', '5-1-8'],
  },
  {
    slug: '5-7-233',
    code: '5.7.233',
    aliases: ['5.7.232'],
    headline: 'Tenant exceeded its daily external recipient limit',
    category: 'rate-limit',
    permanence: 'permanent',
    summary:
      'Exchange Online returns 5.7.233 (or 5.7.232 for a trial tenant) when the whole tenant has emailed more external recipients in 24 hours than its tenant external recipient rate limit allows. The count is a rolling 24-hour window, and sending to outside addresses resumes once it drops below the limit.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.233',
        text: "Your message can't be sent because your tenant exceeded its daily limit for sending email to external recipients (tenant external recipient rate limit)",
      },
      {
        provider: 'microsoft',
        reply: '5.7.232',
        text: "Your message can't be sent because your trial tenant has exceeded its daily limit for sending email to external recipients (tenant external recipient rate limit)",
      },
    ],
    causes: [
      'Combined external sending from all mailboxes in the tenant exceeded the tenant limit.',
      'A trial tenant, which has a lower limit, used for outreach.',
    ],
    fixes: [
      'Wait for the rolling 24-hour count to drop.',
      'Convert a trial tenant to a paid subscription.',
      'Reduce total external volume from the tenant.',
    ],
    coldEmail:
      'Adding more mailboxes to one tenant does not raise this ceiling, because it is shared by the whole tenant.',
    checks: [],
    sources: [MS_NDR, MS_LIMITS],
    related: ['5-7-236', '5-1-90', '5-7-708'],
  },
  {
    slug: '5-7-236',
    code: '5.7.236',
    aliases: [],
    headline: 'onmicrosoft.com domain hit 100 external recipients',
    category: 'rate-limit',
    permanence: 'permanent',
    summary:
      'Exchange Online returns 5.7.236 when your tenant sent to more than 100 external recipients in 24 hours from its onmicrosoft.com domain. Microsoft says those domains are for testing only. Add your own domain to the tenant and send from it; inbound mail is not affected.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.236',
        text: "Your message can't be sent because your tenant has exceeded its daily limit for sending email to external recipients from your tenant's onmicrosoft.com domains",
      },
    ],
    causes: ['Mailboxes are sending with an @<tenant>.onmicrosoft.com address.'],
    fixes: [
      'Add and verify a custom domain in the tenant.',
      'Change users’ primary address to the custom domain so outbound mail uses it.',
    ],
    coldEmail:
      'Never send outreach from an onmicrosoft.com address; it is capped at 100 external recipients a day across the tenant and looks untrustworthy to recipients.',
    checks: ['domain'],
    sources: [MS_NDR],
    related: ['5-7-233', '5-7-750'],
  },
  {
    slug: '4-7-1',
    code: '4.7.1',
    aliases: [],
    headline: 'Temporarily refused (often greylisting)',
    category: 'rate-limit',
    permanence: 'temporary',
    summary:
      '4.7.1 is the temporary form of "delivery not authorized". Many servers send 451 4.7.1 for greylisting: they reject the first attempt from an unfamiliar sender and accept a correct retry a few minutes later. A real mail server retries automatically; a script that never retries will lose the message.',
    variants: [
      {
        provider: 'rfc',
        reply: '4.7.1',
        text: 'Delivery not authorized, message refused',
      },
    ],
    causes: [
      'Greylisting: the receiver defers mail from sender and IP combinations it has not seen before.',
      'A temporary policy or reputation check on the receiver.',
    ],
    fixes: [
      'Make sure your sending software retries temporary failures, as standard mail servers do.',
      'If it never clears, read the text after the code; it may be a reputation deferral.',
    ],
    coldEmail:
      'Tools that send through a real mailbox provider retry automatically. Custom scripts that treat a 4xx as final will silently drop mail to greylisting servers.',
    checks: ['blacklist'],
    sources: [RFC_3463, RFC_6647],
    related: ['4-7-0', '5-7-1'],
  },

  // ─── Recipient address and mailbox problems ──────────────────────────────────────────────────
  {
    slug: '5-1-1',
    code: '5.1.1',
    aliases: [],
    headline: 'Recipient address does not exist',
    category: 'recipient',
    permanence: 'permanent',
    summary:
      '5.1.1 means the recipient address does not exist: a typo, a deleted account, or a guessed address. Gmail says "the email account that you tried to reach does not exist"; Microsoft calls it "bad destination mailbox address". It is a hard bounce. Remove the address and never retry it.',
    variants: [
      {
        provider: 'gmail',
        reply: '550 5.1.1',
        text: 'The email account that you tried to reach does not exist.',
      },
      {
        provider: 'microsoft',
        reply: '5.1.1',
        text: 'Bad destination mailbox address',
      },
      {
        provider: 'rfc',
        reply: '5.1.1',
        text: 'Bad destination mailbox address',
      },
    ],
    causes: [
      'A typo in the address.',
      'The person left the company and the account was removed.',
      'The address was guessed from a name pattern and never existed.',
    ],
    fixes: [
      'Remove the address from every list and sequence.',
      'Verify lists before sending; a high hard-bounce rate damages sender reputation.',
    ],
    coldEmail:
      'Hard bounces are one of the fastest ways to burn a cold email domain. Verify every list before it goes into a sequence, and pause any campaign whose bounce rate climbs above a few percent.',
    checks: ['mx'],
    sources: [GMAIL, MS_NDR, RFC_3463],
    related: ['5-1-10', '5-4-1', '5-2-1'],
  },
  {
    slug: '5-1-10',
    code: '5.1.10',
    aliases: ['5.5.0'],
    headline: 'Recipient not found (Microsoft)',
    category: 'recipient',
    permanence: 'permanent',
    summary:
      'Exchange Online returns 5.1.10 when an SMTP address lookup cannot find the recipient. For @hotmail.com and @outlook.com addresses, Microsoft returns the similar 550 5.5.0 "mailbox unavailable". Either way the address does not exist, so treat it as a hard bounce and remove it.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.1.10',
        text: 'Recipient not found',
      },
      {
        provider: 'outlook-com',
        reply: '550 5.5.0',
        text: '550 5.5.0 Requested action not taken: mailbox unavailable',
      },
    ],
    causes: [
      'The address is misspelled or no longer exists.',
      'An Outlook.com or Hotmail account that was closed or never created.',
    ],
    fixes: ['Remove the address and verify the rest of the list before resending.'],
    coldEmail:
      'Old or scraped lists are full of closed Hotmail and Outlook.com addresses. Verify before sending rather than letting bounces do it.',
    checks: ['mx'],
    sources: [MS_NDR],
    related: ['5-1-1', '5-4-1'],
  },
  {
    slug: '5-4-1',
    code: '5.4.1',
    aliases: [],
    headline: 'Relay access denied / recipient address rejected',
    category: 'recipient',
    permanence: 'permanent',
    summary:
      'Exchange Online returns 5.4.1 in two cases: "Recipient address rejected: Access denied" means the address does not exist and Directory Based Edge Blocking rejected it; "Relay Access Denied" means the server does not accept mail for that domain, usually from an MX or DNS misconfiguration.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.4.1',
        text: 'Recipient address rejected: Access denied',
      },
      {
        provider: 'microsoft',
        reply: '5.4.1',
        text: 'Relay Access Denied',
      },
    ],
    causes: [
      'The recipient address does not exist in the Microsoft 365 organization.',
      'The domain’s MX record points to Microsoft 365, but the domain is not set up there.',
    ],
    fixes: [
      '"Recipient address rejected": remove the address; it is a hard bounce.',
      '"Relay Access Denied" on your own domain: check the MX record and accepted domains in Microsoft 365.',
    ],
    coldEmail:
      'For outreach, "Recipient address rejected: Access denied" is the most common Microsoft 365 hard bounce. Treat it exactly like 5.1.1.',
    checks: ['mx'],
    sources: [MS_NDR],
    related: ['5-1-1', '5-1-10'],
  },
  {
    slug: '5-2-1',
    code: '5.2.1',
    aliases: [],
    headline: 'Recipient account inactive or disabled',
    category: 'recipient',
    permanence: 'permanent',
    summary:
      'Gmail returns 550 5.2.1 when the recipient account is inactive, and also when the recipient is receiving mail too fast to accept more. The RFC meaning is "mailbox disabled, not accepting messages". For an inactive account, remove the address. For the rate variant, send to that address less often.',
    variants: [
      {
        provider: 'gmail',
        reply: '550 5.2.1',
        text: 'The email account that you tried to reach is inactive.',
      },
      {
        provider: 'gmail',
        reply: '550 5.2.1',
        text: 'The user you are trying to contact is receiving email at a rate that prevents additional messages from being delivered.',
      },
      {
        provider: 'rfc',
        reply: '5.2.1',
        text: 'Mailbox disabled, not accepting messages',
      },
    ],
    causes: [
      'The Google account was disabled or abandoned.',
      'The recipient is being flooded with mail.',
    ],
    fixes: [
      'Inactive account: suppress the address.',
      'Rate variant: space out mail to that recipient.',
    ],
    coldEmail:
      'Inactive-account bounces suggest a stale list. If several appear in one campaign, re-verify the whole list.',
    checks: [],
    sources: [GMAIL, RFC_3463],
    related: ['5-1-1', '4-2-1', '5-2-2'],
  },
  {
    slug: '5-7-12',
    code: '5.7.12',
    aliases: ['5.7.133', '5.7.134', '5.7.136'],
    headline: 'Recipient only accepts mail from inside its organization',
    category: 'recipient',
    permanence: 'permanent',
    summary:
      'Exchange Online returns 5.7.12 (and 5.7.133, 5.7.134 or 5.7.136 for groups, mailboxes and mail users) when the recipient is set to reject mail from outside its own organization. Nothing on your side will fix it. Only the recipient’s admin or group owner can change that setting.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.12',
        text: 'Sender was not authenticated by organization',
      },
      {
        provider: 'microsoft',
        reply: '5.7.133',
        text: 'Sender not authenticated for group',
      },
      {
        provider: 'microsoft',
        reply: '5.7.134',
        text: 'Sender was not authenticated for mailbox',
      },
      {
        provider: 'microsoft',
        reply: '5.7.136',
        text: 'Sender was not authenticated',
      },
    ],
    causes: [
      'The address is an internal-only mailbox, group or distribution list.',
      'The recipient organization restricts external mail to that address.',
    ],
    fixes: [
      'Contact the person through another channel if the mail is expected.',
      'Remove internal-only group addresses from outreach lists.',
    ],
    coldEmail:
      'Role and group addresses scraped from websites are often internal-only. Suppress them instead of retrying.',
    checks: [],
    sources: [MS_NDR],
    related: ['5-7-1', '5-7-513'],
  },
  {
    slug: '5-7-703',
    code: '5.7.703',
    aliases: [],
    headline: 'Blocked by your own Tenant Allow/Block List',
    category: 'account',
    permanence: 'permanent',
    summary:
      'Exchange Online returns 5.7.703 when someone in your own organization sends to an address or domain that is blocked in your Tenant Allow/Block List. The whole message is blocked for every recipient, even if only one recipient matches a block entry. An admin in your tenant must remove the entry.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.703',
        text: "Your message can't be delivered because messages to XXX, YYY are blocked by your organization using Tenant Allow Block List.",
      },
    ],
    causes: ['An admin in your organization blocked the recipient address or domain.'],
    fixes: [
      'Ask your Microsoft 365 admin to review the Tenant Allow/Block List in Microsoft Defender.',
      'Send separately to the unblocked recipients.',
    ],
    coldEmail:
      'If a prospect’s domain is on your own block list, a colleague probably added it for a reason. Check before removing it.',
    checks: [],
    sources: [MS_NDR],
    related: ['5-7-513'],
  },

  // ─── Your account, tenant or relay setup ─────────────────────────────────────────────────────
  {
    slug: '5-7-57',
    code: '5.7.57',
    aliases: [],
    headline: 'Client not authenticated to send anonymous mail',
    category: 'account',
    permanence: 'permanent',
    summary:
      'Exchange Online returns 5.7.57 when an app or device sends through smtp.office365.com without authenticating first. To fix it, configure the application to log in (SMTP AUTH, port 587, STARTTLS) with a licensed mailbox, or use a connector-based relay instead of anonymous submission.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.57',
        text: 'Client was not authenticated to send anonymous mail during MAIL FROM',
      },
    ],
    causes: [
      'The application has no username and password (or OAuth token) configured.',
      'The app connects without STARTTLS, so authentication never happens.',
      'SMTP AUTH is disabled for the mailbox or the tenant.',
    ],
    fixes: [
      'Enable authentication in the app, using smtp.office365.com on port 587 with STARTTLS.',
      'Check that SMTP AUTH is enabled for the mailbox.',
      'For devices that cannot authenticate, set up a Microsoft 365 connector for relay.',
    ],
    coldEmail:
      'Cold email and warmup tools that connect Microsoft 365 mailboxes over SMTP need SMTP AUTH or OAuth working first. This is a setup error, not a reputation problem.',
    checks: [],
    sources: [MS_NDR, MS_SMTP_AUTH],
    related: ['5-7-139', '5-7-1'],
  },
  {
    slug: '5-7-139',
    code: '5.7.139',
    aliases: [],
    headline: 'SMTP authentication disabled (Microsoft 365)',
    category: 'account',
    permanence: 'permanent',
    summary:
      'Microsoft 365 returns 535 5.7.139 "Authentication unsuccessful" when an app tries SMTP AUTH but it is switched off, most often by the tenant setting "Turn off SMTP AUTH protocol for your organization" or by security defaults. Enable Authenticated SMTP for that mailbox, or connect with OAuth instead.',
    variants: [
      {
        provider: 'microsoft',
        reply: '535 5.7.139',
        text: 'Authentication unsuccessful, SmtpClientAuthentication is disabled for the Tenant.',
      },
    ],
    causes: [
      'SMTP AUTH is disabled organization-wide (the default for many tenants).',
      'Security defaults are on, which disables SMTP AUTH.',
      'The mailbox has Authenticated SMTP turned off, overriding the tenant setting.',
    ],
    fixes: [
      'In the Microsoft 365 admin center: Users > Active users > the user > Mail > Manage email apps > tick Authenticated SMTP.',
      'Or in PowerShell: Set-CASMailbox -Identity <mailbox> -SmtpClientAuthenticationDisabled $false.',
      'If security defaults are on, SMTP AUTH stays off. Prefer an OAuth connection where the tool supports it.',
    ],
    coldEmail:
      'This is the most common error when connecting a new Microsoft 365 mailbox to an outreach or warmup tool. It is a one-time admin setting per mailbox.',
    checks: [],
    sources: [MS_SMTP_AUTH],
    related: ['5-7-57'],
  },

  // ─── TLS and delivery transport ──────────────────────────────────────────────────────────────
  {
    slug: '5-7-29',
    code: '5.7.29',
    aliases: ['4.7.29'],
    headline: 'Message not sent over TLS',
    category: 'transport',
    permanence: 'both',
    summary:
      'Gmail returns 5.7.29 when a message was not sent over a TLS connection, and 421 4.7.29 when it rate-limits you for the same reason. Google’s sender guidelines require TLS. Enable STARTTLS on the sending server, or send through a provider that already uses it.',
    variants: [
      {
        provider: 'gmail',
        reply: '550 5.7.29',
        text: "This message was blocked because it wasn't sent over a TLS connection.",
      },
      {
        provider: 'gmail',
        reply: '421 4.7.29',
        text: "Your email has been rate limited because you're not using a TLS connection.",
      },
    ],
    causes: [
      'A self-hosted mail server with STARTTLS turned off or misconfigured.',
      'An old appliance or script that sends in plain text.',
    ],
    fixes: [
      'Enable opportunistic TLS (STARTTLS) for outbound mail on your server.',
      'Install a valid certificate for the server’s hostname.',
    ],
    coldEmail:
      'Google Workspace and Microsoft 365 send over TLS already. This code shows up only when mail leaves through your own server or an old relay.',
    checks: [],
    sources: [GMAIL, GMAIL_SENDER_GUIDELINES],
    related: ['4-7-0', '5-7-25'],
  },
  {
    slug: '5-7-510',
    code: '5.7.510',
    aliases: [],
    headline: 'Recipient does not accept email over IPv6',
    category: 'transport',
    permanence: 'permanent',
    summary:
      'Microsoft 365 returns 5.7.510 when you delivered over IPv6 to a recipient domain that does not accept email over IPv6. Configure your sending server to deliver to that domain over IPv4, or prefer IPv4 for all outbound mail in general.',
    variants: [
      {
        provider: 'microsoft',
        reply: '5.7.510',
        text: 'Access denied, [contoso.com] does not accept email over IPv6',
      },
    ],
    causes: ['Your server has an IPv6 address and used it to deliver.'],
    fixes: [
      'Prefer IPv4 for outbound SMTP, for example with Postfix’s smtp_address_preference = ipv4.',
    ],
    coldEmail:
      'Only relevant to self-hosted sending. Mailbox-provider sending handles this automatically.',
    checks: ['mx'],
    sources: [MS_NDR],
    related: ['5-7-25', '5-7-26'],
  },
  {
    slug: '4-4-7',
    code: '4.4.7',
    aliases: [],
    headline: 'Message expired in the queue',
    category: 'transport',
    permanence: 'temporary',
    summary:
      '4.4.7 means the message sat in the sending queue until it expired without being delivered. The sending server kept retrying, but the receiving server never accepted it in time. This usually points to a problem on the receiving side, but repeated deferrals caused by your reputation end the same way.',
    variants: [
      {
        provider: 'microsoft',
        reply: '4.4.7',
        text: 'Message expired',
      },
      {
        provider: 'rfc',
        reply: '4.4.7',
        text: 'Delivery time expired',
      },
    ],
    causes: [
      'The receiving server was down or unreachable for the whole retry period.',
      'The receiver kept deferring your mail (for example with 4.7.x reputation deferrals).',
      'A header limit or protocol timeout on the remote server.',
    ],
    fixes: [
      'Check the recipient domain’s MX records.',
      'Look further up the bounce for the last temporary error; that is the real reason.',
      'Resend once the receiving server is reachable.',
    ],
    coldEmail:
      'When many recipients at different domains expire at once, the cause is usually your reputation, not their servers. Look for 4.7.x deferrals in the earlier delivery attempts.',
    checks: ['mx'],
    sources: [MS_NDR, RFC_3463],
    related: ['4-7-0', '4-7-500', '4-4-2'],
  },
  {
    slug: '4-3-0',
    code: '4.3.0',
    aliases: [],
    headline: 'Mail server temporarily rejected the message',
    category: 'transport',
    permanence: 'temporary',
    summary:
      '4.3.0 is a temporary mail-system error. Gmail uses 451 4.3.0 when it has temporarily rejected a message, or when one SMTP transaction tried to deliver to more than one destination domain, and 421 4.3.0 for a temporary system problem. The sending server retries, so a single 4.3.0 usually clears on its own.',
    variants: [
      {
        provider: 'gmail',
        reply: '451 4.3.0',
        text: 'Email server has temporarily rejected this message.',
      },
      {
        provider: 'gmail',
        reply: '451 4.3.0',
        text: 'Multiple destination domains per transaction is unsupported. Please try again.',
      },
      {
        provider: 'gmail',
        reply: '421 4.3.0',
        text: 'Temporary System Problem. Try again later.',
      },
      {
        provider: 'rfc',
        reply: '4.3.0',
        text: 'Other or undefined mail system status',
      },
    ],
    causes: [
      'A short outage or overload on the receiving side.',
      'A sending script or relay that puts recipients at several different domains into one SMTP transaction.',
      'A burst of traffic from your server at that moment.',
    ],
    fixes: [
      'Let the sending server retry; most 4.3.0 deferrals clear within minutes.',
      'If the multiple-destination-domains message appears, send one SMTP transaction per recipient domain, as RFC 5321 expects.',
      'If the deferrals keep ending in bounces, look for 4.7.x reputation codes in the same bounce: those are the real cause.',
    ],
    coldEmail:
      'Rare from Google Workspace or Microsoft 365 mailboxes, which split transactions correctly. A run of 4.3.0 deferrals from a custom sending script usually means it batches recipients across domains.',
    checks: [],
    sources: [GMAIL, RFC_3463],
    related: ['4-4-5', '4-4-2', '4-7-0'],
  },
  {
    slug: '4-4-2',
    code: '4.4.2',
    aliases: [],
    headline: 'Connection timed out',
    category: 'transport',
    permanence: 'temporary',
    summary:
      '451 4.4.2 means the connection between the sending and receiving servers timed out or dropped before the message was fully delivered. Gmail closes idle or slow connections with this code. It is temporary: the sending server retries on a new connection, and it only becomes a bounce if every retry fails.',
    variants: [
      {
        provider: 'gmail',
        reply: '451 4.4.2',
        text: 'Timeout - closing connection.',
      },
      {
        provider: 'rfc',
        reply: '4.4.2',
        text: 'Bad connection',
      },
    ],
    causes: [
      'A slow or unstable network path between the two servers.',
      'A sending server that pauses too long between SMTP commands, for example while scanning a large message.',
      'A large attachment on a slow uplink.',
    ],
    fixes: [
      'Let the server retry; an occasional timeout is normal on the internet.',
      'If a self-hosted server sees them constantly, check its network, DNS resolution speed and outbound bandwidth.',
      'Keep cold emails small: no attachments and few images.',
    ],
    coldEmail:
      'Not a reputation signal. Occasional 4.4.2 retries on outreach are harmless; a steady stream from your own server points at its network, not at your domain.',
    checks: [],
    sources: [GMAIL, RFC_3463],
    related: ['4-4-5', '4-4-7', '4-3-0'],
  },
  {
    slug: '4-4-5',
    code: '4.4.5',
    aliases: [],
    headline: 'Server busy, try again later',
    category: 'transport',
    permanence: 'temporary',
    summary:
      '421 4.4.5 means the receiving server is too busy to accept mail right now. Gmail returns it as “Server busy, try again later”, and the RFC meaning is mail system congestion. It is temporary and usually not about your reputation: the sending server waits and retries, and the message normally goes through later.',
    variants: [
      {
        provider: 'gmail',
        reply: '421 4.4.5',
        text: 'Server busy, try again later.',
      },
      {
        provider: 'rfc',
        reply: '4.4.5',
        text: 'Mail system congestion',
      },
    ],
    causes: [
      'Load or maintenance on the receiving side.',
      'Many simultaneous connections from your server to the same provider.',
    ],
    fixes: [
      'Let the sending server retry.',
      'On a self-hosted server, lower the number of simultaneous connections to the same provider.',
    ],
    coldEmail:
      'If 4.4.5 shows up only when a campaign starts, you are opening too many connections at once. Spreading sends through the day instead of in bursts avoids it.',
    checks: [],
    sources: [GMAIL, RFC_3463],
    related: ['4-4-2', '4-3-0', '4-2-1'],
  },
  {
    slug: '4-5-0',
    code: '4.5.0',
    aliases: [],
    headline: 'SMTP protocol violation',
    category: 'transport',
    permanence: 'temporary',
    summary:
      '451 4.5.0 means the receiving server saw an SMTP protocol violation: commands sent out of order, malformed, or not allowed by RFC 5321. Gmail treats it as temporary. It almost always comes from a custom script, an old appliance or a misconfigured relay, not from Google Workspace or Microsoft 365 mailboxes.',
    variants: [
      {
        provider: 'gmail',
        reply: '451 4.5.0',
        text: 'SMTP protocol violation.',
      },
      {
        provider: 'rfc',
        reply: '4.5.0',
        text: 'Other or undefined protocol status',
      },
    ],
    causes: [
      'A hand-written SMTP client that skips or reorders commands, or sends bad line endings.',
      'A proxy, firewall or antivirus product that rewrites the SMTP conversation.',
      'SMTP pipelining used incorrectly.',
    ],
    fixes: [
      'Send through a standard mail library or your mailbox provider instead of raw SMTP.',
      'Capture the SMTP conversation and compare it with RFC 5321.',
      'Check for a firewall or antivirus product inspecting outbound traffic on ports 25 and 587.',
    ],
    coldEmail:
      'You will not see this from a connected Google Workspace or Microsoft 365 mailbox. If a homegrown sender produces it, fix the sender before scaling volume.',
    checks: [],
    sources: [GMAIL, RFC_3463],
    related: ['4-3-0', '4-4-2', '5-7-29'],
  },
];

/** Look up a page entry by slug. */
export function getSmtpError(slug: string): SmtpErrorEntry | undefined {
  return smtpErrors.find((entry) => entry.slug === slug);
}

/** "5.7.26" → "5-7-26" — the URL form of an enhanced status code. */
export function codeToSlug(code: string): string {
  return code.replace(/\./g, '-');
}

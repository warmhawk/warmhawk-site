/**
 * Polls Resend's REST API for a just-sent email — the "real dependency" check for this repo's new
 * integration / human-journey test tiers (Decision: these tiers deliberately override the "no live
 * external network calls" build policy that governs the `*.test.ts` unit suite — see
 * lib/stripe.ts's / lib/email.ts's header comments, which still apply to that suite only).
 *
 * Modeled on the general shape of jitterflow-core-app's own tests/human-journeys/resendEmail.ts
 * helper (same job: a transactional email send isn't synchronous with "arrived and retrievable via
 * the provider's API", so callers poll rather than assume it landed immediately).
 *
 * Endpoint shapes below follow Resend's documented REST API conventions
 * (https://resend.com/docs/api-reference/emails) — `GET /emails/:id` (retrieve a single sent
 * email, including its body) is confirmed-documented; the list step first calls `GET /emails` and
 * filters client-side, since Resend's list endpoint does not document server-side filtering by
 * recipient. If Resend's actual list-endpoint shape differs by the time this runs for real, only
 * `fetchRecentEmailId` below needs adjusting — everything else (retry loop, body-fetch, the
 * `waitForResendEmail` contract) stays the same.
 */

export interface ResendEmailRecord {
  subject: string;
  text: string;
}

export interface WaitForResendEmailInput {
  apiKey: string;
  toEmail: string;
  subjectContains: string;
  /** Default 30s — callers doing a full checkout->webhook->email round trip should pass a much
   *  longer value (e.g. 120_000), since real Stripe webhook delivery latency dominates. */
  timeoutMs?: number;
}

const POLL_INTERVAL_MS = 1000;
const RESEND_API_BASE = 'https://api.resend.com';

interface ResendListItem {
  id: string;
  to: string[] | string;
  subject: string;
}

interface ResendListResponse {
  data?: ResendListItem[];
}

interface ResendEmailDetail {
  subject?: string;
  text?: string;
}

async function fetchRecentEmailId(
  apiKey: string,
  toEmail: string,
  subjectContains: string,
): Promise<string | null> {
  const res = await fetch(`${RESEND_API_BASE}/emails`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;

  const body = (await res.json()) as ResendListResponse;
  const match = (body.data ?? []).find((item) => {
    const recipients = Array.isArray(item.to) ? item.to : [item.to];
    return recipients.includes(toEmail) && item.subject.includes(subjectContains);
  });
  return match?.id ?? null;
}

async function fetchEmailBody(apiKey: string, id: string): Promise<ResendEmailRecord | null> {
  const res = await fetch(`${RESEND_API_BASE}/emails/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;

  const body = (await res.json()) as ResendEmailDetail;
  if (!body.subject) return null;
  return { subject: body.subject, text: body.text ?? '' };
}

/** Polls Resend for an email matching `toEmail` + `subjectContains`, retrying roughly every second
 *  up to `timeoutMs`. Returns `null` on timeout rather than throwing — callers assert non-null
 *  themselves with a message specific to what they were waiting for, per this repo's "degrade,
 *  don't crash silently" convention (see lib/email.ts / lib/statusProvider.ts). Requires a real
 *  `RESEND_API_KEY` — see .env/.env.example. */
export async function waitForResendEmail({
  apiKey,
  toEmail,
  subjectContains,
  timeoutMs = 30000,
}: WaitForResendEmailInput): Promise<ResendEmailRecord | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const id = await fetchRecentEmailId(apiKey, toEmail, subjectContains);
    if (id) {
      const full = await fetchEmailBody(apiKey, id);
      if (full) return full;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return null;
}

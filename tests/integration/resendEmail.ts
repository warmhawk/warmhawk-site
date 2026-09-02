/**
 * Polls Resend's REST API for a just-sent email — the "real dependency" check for this repo's new
 * integration / human-journey test tiers (Decision: these tiers deliberately override the "no live
 * external network calls" build policy that governs the `*.test.ts` unit suite — see
 * lib/stripe.ts's / lib/email.ts's header comments, which still apply to that suite only).
 *
 * Modeled on the general shape of a similar polling helper used elsewhere for the same job: a
 * transactional email send isn't synchronous with "arrived and retrievable via the provider's
 * API", so callers poll rather than assume it landed immediately.
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
  /**
   * Only an email created at/after this instant is eligible — required, not optional. Both real
   * call sites (checkout-and-license.spec.ts and route.integration.test.ts) send to the exact
   * same recipient (`delivered@resend.dev`) with the exact same subject
   * ("Your WarmHawk install command") by design, since that recipient is Resend's shared
   * simulation sink. Without this cutoff, `fetchRecentEmailId` below can match the OTHER suite's
   * still-recent email instead of the one this call just triggered — confirmed live 2026-09-01
   * (warmhawk-site pipeline 63): the human-journeys spec's real checkout succeeded, but its
   * billing-portal step failed with Stripe's "No such customer: 'cus_integration_test'" because
   * it had picked up route.integration.test.ts's synthetic license email (same recipient/subject,
   * issued minutes earlier in the same pipeline run) instead of its own. Pass `new Date()`
   * captured right before triggering the send.
   */
  sentAfter: Date;
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
  created_at: string;
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
  sentAfter: Date,
): Promise<string | null> {
  const res = await fetch(`${RESEND_API_BASE}/emails`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;

  const body = (await res.json()) as ResendListResponse;
  const matches = (body.data ?? []).filter((item) => {
    const recipients = Array.isArray(item.to) ? item.to : [item.to];
    return (
      recipients.includes(toEmail) &&
      item.subject.includes(subjectContains) &&
      new Date(item.created_at) >= sentAfter
    );
  });
  // Newest first: if more than one eligible email exists (e.g. a retry), the one this specific
  // call actually cares about is always the most recent.
  matches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return matches[0]?.id ?? null;
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
  sentAfter,
  timeoutMs = 30000,
}: WaitForResendEmailInput): Promise<ResendEmailRecord | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const id = await fetchRecentEmailId(apiKey, toEmail, subjectContains, sentAfter);
    if (id) {
      const full = await fetchEmailBody(apiKey, id);
      if (full) return full;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return null;
}

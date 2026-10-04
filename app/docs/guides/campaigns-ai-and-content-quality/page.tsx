import Link from 'next/link';
import type { Metadata } from 'next';
import { pageSeo } from '@/lib/seo';
import { AnswerBlock } from '@/components/AnswerBlock';
import { CodeBlock } from '@/components/CodeBlock';
import { FaqSection } from '@/components/FaqSchema';

export const metadata: Metadata = pageSeo({
  title: 'Campaigns, AI & content quality',
  description:
    'How WarmHawk campaigns work: template vs aiPromptTemplate, native spintax, BYOK Gemini/Claude personalization, the per-save content-quality score and launch/pause.',
  path: '/docs/guides/campaigns-ai-and-content-quality',
});

const faqItems = [
  {
    question: 'What is the difference between template and aiPromptTemplate?',
    answer:
      'template is the literal body sent as-is — or used as a fallback if no AI provider is configured or personalization fails — and it supports spintax {option one|option two} variation. aiPromptTemplate is the instruction handed to your AI key, which then writes the actual send; it supports flat {{fieldName}} placeholders instead of spintax.',
  },
  {
    question: 'Does a low content-quality score block a campaign from launching?',
    answer:
      "No. The spam-word score is advisory — computed on every save and returned in the response so the dashboard's Content Quality tab can surface it, but it never hard-blocks a launch. Unbalanced spintax syntax does block a save (422), since it would break rendering at send time.",
  },
  {
    question: 'What happens if my BYOK AI key is missing or the call fails?',
    answer:
      "WarmHawk retries once after a short delay, then falls back to sending the campaign's plain template as-is rather than stalling the send — aiPersonalizationFailed: true is set so it's visible, but the lead still gets emailed on schedule.",
  },
  {
    question: 'Why does launching a campaign sometimes return a 422?',
    answer:
      'The launch check found something to fix, and the 422 lists every problem at once, not just the first: no mailbox picked to send from (NO_SENDERS), a sending domain with no mailing address (DOMAIN_NO_ADDRESS, one per domain), no working unsubscribe link (NO_UNSUBSCRIBE), the bounce circuit breaker tripped (BOUNCE_PAUSED), or an empty first email or follow-up (EMAIL_EMPTY, STEP_EMPTY). A campaign with no unsubscribeUrlTemplate of its own uses the unsubscribe page WarmHawk serves on your install’s domain, so NO_UNSUBSCRIBE only refuses an install that has no domain set. GET /v1/campaigns/:id/launch-check runs the same check without launching.',
  },
  {
    question: 'Do follow-ups come from a different mailbox if the first one is busy?',
    answer:
      'No. A lead is pinned to the mailbox that sent its first email, and every follow-up goes from that one mailbox as a reply in the same thread. If that mailbox can’t send (paused, needs reconnecting, at its daily cap, or its domain lost its address), the follow-up waits rather than switching sender.',
  },
];

export default function CampaignsAiContentQualityPage() {
  return (
    <div className="py-16">
      <div className="label text-rust mb-5">
        Docs / Guides / Campaigns, AI &amp; content quality
      </div>
      <h1 className="font-display text-4xl md:text-[48px] leading-tight font-semibold mb-6 max-w-3xl">
        Two content fields, one job each.
      </h1>
      <p className="text-lg leading-relaxed text-ink-muted max-w-2xl mb-8">
        A campaign ties a message to a send policy. Content quality (spam score, spintax validity)
        is evaluated on every save, not just before send &mdash; so you see the signal while
        you&rsquo;re still writing, not after launch.
      </p>
      <AnswerBlock>
        A WarmHawk campaign has two content fields: template (the literal fallback body, supports
        native spintax variation) and aiPromptTemplate (instructions for your BYOK Gemini/Claude
        key, supports flat {'{{fieldName}}'} placeholders). Every create/update computes a
        contentQuality block — spam-word score plus spintax group count. A campaign sends only from
        the mailboxes it picks, can add up to three follow-ups in the same thread, and launching
        enforces CAN-SPAM (an address on every sending domain, a working unsubscribe link) and the
        bounce circuit breaker before it will go live.
      </AnswerBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">Create and update</h2>
      <CodeBlock label="POST /v1/campaigns">
        {`curl -X POST https://app.yourcompany.com/v1/campaigns \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Q3 outbound — agencies",
    "template": "Hi there — {quick question|one question} for you today?",
    "aiPromptTemplate": "Write a 2-sentence opener to {{firstName}} at {{company}}, referencing {{recentNews}}.",
    "aiProvider": "GEMINI",
    "unsubscribeUrlTemplate": "https://yourcompany.com/unsubscribe?email={{email}}"
  }'`}
      </CodeBlock>
      <CodeBlock label="Response (201) — includes contentQuality">
        {`{
  "id": "camp_g7h8i9",
  "name": "Q3 outbound — agencies",
  "status": "DRAFT",
  "contentQuality": { "spamScore": { "score": 2, "flaggedTerms": [] }, "spintaxGroupCount": 1 }
}`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-10">
        <code className="font-mono">PATCH /v1/campaigns/:id</code> takes the same content fields
        (plus <code className="font-mono">bounceRateThreshold</code> and{' '}
        <code className="font-mono">pausedForBounceRate</code> for a dashboard&rsquo;s
        &ldquo;resume&rdquo; action) and recomputes{' '}
        <code className="font-mono">contentQuality</code> whenever{' '}
        <code className="font-mono">template</code> or <code className="font-mono">subject</code>{' '}
        changes. It refuses <code className="font-mono">status</code> and any unknown field with{' '}
        <code className="font-mono">422</code>, so a campaign only goes live through the launch
        check below. Malformed spintax &mdash; an unbalanced{' '}
        <code className="font-mono">{'{'}</code>/<code className="font-mono">{'}'}</code> &mdash;
        returns <code className="font-mono">422</code> on either call, since it would break
        rendering at send time, not just read oddly.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Native spintax</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Syntax: <code className="font-mono">{'{option one|option two|option three}'}</code>,
        resolved to one uniformly-random option per send. Groups can nest. It works independently of
        AI configuration, so a campaign with no AI provider at all still gets per-send variation
        instead of one identical template hitting every lead:
      </p>
      <CodeBlock label="Spintax in template">
        {`Hey {there|friend} — {quick|fast} question about your {outbound|cold email} process?`}
      </CodeBlock>

      <h2 className="font-display text-2xl font-semibold mb-4">BYOK AI personalization</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Save a Gemini or Claude key once (validated with one lightweight call before it&rsquo;s
        encrypted and stored):
      </p>
      <CodeBlock label="POST /v1/ai-providers">
        {`curl -X POST https://app.yourcompany.com/v1/ai-providers \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "provider": "GEMINI", "apiKey": "YOUR_GEMINI_KEY", "model": "gemini-2.5-flash" }'`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-4">
        Set <code className="font-mono">aiProvider</code> on the campaign and every send fills{' '}
        <code className="font-mono">aiPromptTemplate</code>&rsquo;s{' '}
        <code className="font-mono">{'{{fieldName}}'}</code> placeholders from the lead&rsquo;s{' '}
        <code className="font-mono">firstName</code>/<code className="font-mono">lastName</code>/
        <code className="font-mono">company</code> and its flat{' '}
        <code className="font-mono">customFields</code>, then hands the whole lead context to your
        key to write the finished body &mdash; never the other way around (WarmHawk never routes
        your key through a shared gateway). Delete a key with{' '}
        <code className="font-mono">DELETE /v1/ai-providers/:provider</code>; campaigns referencing
        it fall back to sending <code className="font-mono">template</code> unpersonalized rather
        than breaking.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        Every AI-generated send that resolves to an EU recipient gets the EU AI Act Article 50
        disclosure marker appended automatically &mdash; a fallback (unpersonalized) send has
        nothing to disclose, so the marker only appears on genuinely AI-written content. See{' '}
        <Link href="/docs/reference/guardrails-and-compliance" className="text-rust font-semibold">
          Guardrails &amp; compliance
        </Link>
        .
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Senders and follow-ups</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        <code className="font-mono">mailboxIds</code> is the list of mailboxes a campaign sends its
        first emails from. The queue rotates across only those, least recently used first, so one
        client&rsquo;s campaign never goes out from another client&rsquo;s mailbox. New mailboxes
        are never added to a campaign on their own. A warming mailbox can be picked and joins the
        rotation once its warm-up finishes.
      </p>
      <CodeBlock label="PATCH /v1/campaigns/:id — senders and follow-ups">
        {`curl -X PATCH https://app.yourcompany.com/v1/campaigns/camp_g7h8i9 \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "mailboxIds": ["mbx_a1b2c3", "mbx_d4e5f6"],
    "steps": [
      { "waitDays": 3, "body": "Just floating this back up — worth a look?", "aiRewrite": false },
      { "waitDays": 4, "body": "Last note from me on this one.", "aiRewrite": true }
    ]
  }'`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-4">
        <code className="font-mono">steps</code> holds up to three follow-ups, each waiting{' '}
        <code className="font-mono">waitDays</code> (1&ndash;30) after the email before it. Both
        lists replace the whole set on every call. How a sequence runs:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        <li>
          <strong className="text-ink">Same mailbox.</strong> A lead is pinned to the mailbox that
          sent its first email, and every follow-up goes from it. If that mailbox can&rsquo;t send,
          the follow-up waits rather than switching sender.
        </li>
        <li>
          <strong className="text-ink">Same thread.</strong> The subject is &ldquo;Re:&rdquo; plus
          the first subject, with In-Reply-To and References set, so the inbox shows one
          conversation.
        </li>
        <li>
          <strong className="text-ink">Follow-ups first.</strong> Due follow-ups take a
          mailbox&rsquo;s daily capacity before new first emails, so a started sequence keeps its
          timing.
        </li>
        <li>
          <strong className="text-ink">Stops on its own.</strong> A reply to any email in the
          thread, a bounce, an unsubscribe or a suppression ends the sequence for that lead.
        </li>
        <li>
          <strong className="text-ink">Unticking a mailbox</strong> stops its new first emails only.
          It still sends the follow-ups for leads it already started.
        </li>
      </ul>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        Each follow-up&rsquo;s <code className="font-mono">body</code> is what sends when AI is off
        or fails; with <code className="font-mono">aiRewrite: true</code> your AI key rewrites it
        using the campaign&rsquo;s AI settings. The footer and unsubscribe link are the same as the
        first email&rsquo;s, from the pinned mailbox&rsquo;s domain.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Launch and pause</h2>
      <CodeBlock label="POST /v1/campaigns/:id/launch">
        {`curl -X POST https://app.yourcompany.com/v1/campaigns/camp_g7h8i9/launch \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
      </CodeBlock>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mt-4 mb-4">
        Runs the launch check and returns every problem at once in a{' '}
        <code className="font-mono">422</code> &mdash; no mailbox picked, a sending domain with no
        mailing address, an unsubscribe link missing on an install with no domain to serve the
        built-in page, an empty first email or follow-up, or the campaign currently{' '}
        <code className="font-mono">pausedForBounceRate</code> (see{' '}
        <Link
          href="/docs/guides/sending-safely-and-domain-health"
          className="text-rust font-semibold"
        >
          Sending safely &amp; domain health
        </Link>
        ) &mdash; otherwise sets <code className="font-mono">{'status: "ACTIVE"'}</code> and returns
        any <code className="font-mono">warnings</code> (a mailbox with no sender name, every
        mailbox still warming, no leads yet, a merge field that is blank or unknown).{' '}
        <code className="font-mono">GET /v1/campaigns/:id/launch-check</code> runs the same check
        without launching. <code className="font-mono">POST /v1/campaigns/:id/pause</code> is the
        reverse. <code className="font-mono">DELETE /v1/campaigns/:id</code> archives (sets{' '}
        <code className="font-mono">{'status: "ARCHIVED"'}</code>) rather than hard-deleting &mdash;
        campaign history isn&rsquo;t personal data, so GDPR erasure is per-lead, not per-campaign.
      </p>
      <CodeBlock label="GET /v1/campaigns — list view with rollups">
        {`curl https://app.yourcompany.com/v1/campaigns -H "Authorization: Bearer YOUR_API_KEY"
# each row includes mailboxIds, steps, senders, launch, progress,
# leadsCount, sentCount, repliesCount, domainsCount, lastActivityAt`}
      </CodeBlock>

      <FaqSection
        items={faqItems}
        title="Campaigns, AI & content quality: questions worth answering up front"
      />
    </div>
  );
}

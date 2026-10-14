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
      "WarmHawk retries once after a short delay, then falls back to sending the campaign's own email rather than stalling the send. The send is logged with aiOutcome AI_FALLBACK and an aiFallbackReason (provider_error, model_unavailable, key_rejected, key_missing, quota_exceeded or content_dropped), and the campaign list counts these as aiFallbackCount, so the lead still gets emailed on schedule and you can see why AI didn't write it.",
  },
  {
    question: 'Why does launching a campaign sometimes return a 422?',
    answer:
      'The launch check found something to fix, and the 422 lists every problem at once, not just the first: no mailbox picked to send from (NO_SENDERS), a sending domain with no mailing address (DOMAIN_NO_ADDRESS, one per domain), no working unsubscribe link (NO_UNSUBSCRIBE), the bounce circuit breaker tripped (BOUNCE_PAUSED), an empty first email or follow-up (EMAIL_EMPTY, STEP_EMPTY), a merge field that isn’t a column in your leads (FIELD_UNKNOWN), or a merge field that is empty for some leads and has no fallback (FIELD_BLANK). A campaign with no unsubscribeUrlTemplate of its own uses the unsubscribe page WarmHawk serves on your install’s domain, so NO_UNSUBSCRIBE only refuses an install that has no domain set. GET /v1/campaigns/:id/launch-check runs the same check without launching.',
  },
  {
    question: 'Can a campaign send only during business hours?',
    answer:
      'Yes. Give the campaign a send schedule: the days, a start and end time, and an IANA time zone, or tick useLeadTimezone to use each lead’s own time zone. WarmHawk spreads each mailbox’s daily limit across those hours, and anything that falls due outside them waits for the next opening. A campaign with no schedule (sendTimezone null) sends at any hour, which is how campaigns created before the schedule existed keep working.',
  },
  {
    question: 'How do I see an email before it goes to a real lead?',
    answer:
      'POST /v1/campaigns/preview renders any step for one of your leads, with merge fields filled and one real AI call when AI is on. POST /v1/campaigns/:id/test-send sends that email to your own address with a “[Test]” subject. Neither touches the lead, and the test email’s unsubscribe link unsubscribes nobody.',
  },
  {
    question: 'Do follow-ups come from a different mailbox if the first one is busy?',
    answer:
      'No. A lead is pinned to the mailbox that sent its first email, and every follow-up goes from that one mailbox as a reply in the same thread. If that mailbox can’t send (paused, needs reconnecting, at its daily cap, or its domain lost its address), the follow-up waits rather than switching sender.',
  },
];

const scheduleFields = [
  {
    field: 'sendTimezone',
    sets: 'An IANA zone such as Europe/London. null turns the schedule off and clears the rest.',
  },
  { field: 'sendDays', sets: 'At least one day, 0 (Sunday) to 6 (Saturday).' },
  {
    field: 'sendStartMinute / sendEndMinute',
    sets: 'Minutes after local midnight: 540 is 9:00, 1020 is 17:00. The end must come after the start.',
  },
  {
    field: 'useLeadTimezone',
    sets: "Use each lead's own time zone, read from a Time zone, Country, State or City column. Leads without one use sendTimezone.",
  },
  {
    field: 'maxNewLeadsPerDay',
    sets: 'Optional cap on first emails per day for the campaign (1 to 10,000). null means no cap.',
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
        the mailboxes it picks, can add up to three follow-ups in the same thread, can be limited to
        set days and hours in a time zone, and launching enforces CAN-SPAM (an address on every
        sending domain, a working unsubscribe link), the bounce circuit breaker and merge fields
        that will fill before it will go live. It marks itself Completed once it has nothing left to
        send.
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

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">Merge fields and fallbacks</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        <code className="font-mono">{'{{firstName}}'}</code>,{' '}
        <code className="font-mono">{'{{company}}'}</code> and any column you imported (stored in{' '}
        <code className="font-mono">customFields</code>) fill from the lead in the subject, the
        first email and every follow-up. Names ignore capitals and underscores, so{' '}
        <code className="font-mono">{'{{First_Name}}'}</code> fills the same as{' '}
        <code className="font-mono">{'{{firstName}}'}</code>. Add a fallback after a{' '}
        <code className="font-mono">|</code> for leads with nothing in that field:{' '}
        <code className="font-mono">{'Hi {{firstName|there}},'}</code> reads &ldquo;Hi there,&rdquo;
        for a lead with no first name.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        A blank value counts as missing, so it takes the fallback too. A field with no fallback
        would otherwise go out as literal <code className="font-mono">{'{{text}}'}</code>, so launch
        refuses it: <code className="font-mono">FIELD_UNKNOWN</code> when no lead has that column,{' '}
        <code className="font-mono">FIELD_BLANK</code> (with{' '}
        <code className="font-mono">missingCount</code>) when some leads have it empty. Values that
        contain <code className="font-mono">$</code> fill as written.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">BYOK AI personalization</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        Save a Gemini or Claude key once. Saving makes one small call to the model you chose, so a
        key that can&rsquo;t use that model (a free Gemini key with no quota for it, say) is refused
        at save with a plain reason, not discovered later when every send falls back. A blank key
        keeps the saved one when you only switch models.
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
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        <code className="font-mono">aiMode</code> picks how much the AI changes:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        <li>
          <strong className="text-ink">
            <code className="font-mono">PERSONALIZE</code> (AI Adjusts, the default).
          </strong>{' '}
          Your email goes out as you wrote it, with one sentence about a real fact from the
          lead&rsquo;s data added after the greeting.
        </li>
        <li>
          <strong className="text-ink">
            <code className="font-mono">PROMPT</code> (AI Writes).
          </strong>{' '}
          The AI writes a new email from your instructions, using your own email as the source of
          the offer and the sign-off. <code className="font-mono">aiWritesSubject: true</code> lets
          it write the subject too.
        </li>
      </ul>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        In both modes the AI must keep your links, prices and greeting, and may not add links you
        didn&rsquo;t write or say how the lead was found. An email that misses gets one retry naming
        what to keep; a second miss sends your own email instead, logged with{' '}
        <code className="font-mono">aiFallbackReason: &quot;content_dropped&quot;</code>. A key that
        runs out of credit falls back with <code className="font-mono">quota_exceeded</code>.
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
        first email&rsquo;s, from the pinned mailbox&rsquo;s domain.{' '}
        <code className="font-mono">waitDays</code> counts calendar days, weekends included.
      </p>

      <h2 className="font-display text-2xl font-semibold mb-4">Send schedule</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        By default a campaign sends at any hour. A schedule limits it to set days and hours in one
        time zone. In the dashboard it&rsquo;s &ldquo;When it sends&rdquo; under Send from, which
        starts at Monday to Friday, 9 to 5, in your browser&rsquo;s time zone.
      </p>
      <CodeBlock label="PATCH /v1/campaigns/:id — Mon–Fri, 9:00–17:00 Chicago time">
        {`curl -X PATCH https://app.yourcompany.com/v1/campaigns/camp_g7h8i9 \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sendTimezone": "America/Chicago",
    "sendDays": [1, 2, 3, 4, 5],
    "sendStartMinute": 540,
    "sendEndMinute": 1020,
    "useLeadTimezone": false,
    "maxNewLeadsPerDay": 50
  }'`}
      </CodeBlock>
      <div className="card overflow-hidden overflow-x-auto max-w-2xl mt-6 mb-4">
        <table className="w-full text-sm border-collapse min-w-[480px]">
          <thead>
            <tr>
              <th className="label text-left p-4 text-ink-muted font-semibold">Field</th>
              <th className="label text-left p-4 text-ink-muted font-semibold border-l border-border">
                What it sets
              </th>
            </tr>
          </thead>
          <tbody>
            {scheduleFields.map((row) => (
              <tr key={row.field}>
                <td className="p-4 border-t border-border align-top font-mono text-[13px]">
                  {row.field}
                </td>
                <td className="p-4 border-t border-l border-border align-top text-ink-muted">
                  {row.sets}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        A <code className="font-mono">PATCH</code> can send only the fields that change; they are
        checked together with the saved ones, and a bad schedule returns{' '}
        <code className="font-mono">422</code> with the reason. Each mailbox&rsquo;s daily limit is
        spread across the open hours rather than sent in a burst at the start, follow-ups go before
        new leads, and an email that comes due while the schedule is closed goes at the next
        opening. Duplicating a campaign copies its schedule.
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
        built-in page, an empty first email or follow-up, a merge field that would go out as literal
        text (see Merge fields above), or the campaign currently{' '}
        <code className="font-mono">pausedForBounceRate</code> (see{' '}
        <Link
          href="/docs/guides/sending-safely-and-domain-health"
          className="text-rust font-semibold"
        >
          Sending safely &amp; domain health
        </Link>
        ) &mdash; otherwise sets <code className="font-mono">{'status: "ACTIVE"'}</code> and returns
        any <code className="font-mono">warnings</code> (a mailbox with no sender name, every
        mailbox still warming, no leads yet).{' '}
        <code className="font-mono">GET /v1/campaigns/:id/launch-check</code> runs the same check
        without launching. <code className="font-mono">POST /v1/campaigns/:id/pause</code> is the
        reverse. <code className="font-mono">DELETE /v1/campaigns/:id</code> archives (sets{' '}
        <code className="font-mono">{'status: "ARCHIVED"'}</code>) rather than hard-deleting &mdash;
        campaign history isn&rsquo;t personal data, so GDPR erasure is per-lead, not per-campaign.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        A sending campaign marks itself <code className="font-mono">COMPLETED</code> once no lead is
        waiting for a first email or a follow-up. Give it new work (import more leads, add a
        follow-up) and it goes back to <code className="font-mono">ACTIVE</code> on its own. Paused,
        draft and archived campaigns are left as they are.
      </p>
      <CodeBlock label="GET /v1/campaigns — list view with rollups">
        {`curl https://app.yourcompany.com/v1/campaigns -H "Authorization: Bearer YOUR_API_KEY"
# each row includes mailboxIds, steps, senders, launch, progress, sendWindow,
# leadsCount, sentCount, repliesCount, domainsCount, lastActivityAt,
# aiWrittenCount, aiFallbackCount
#
# progress: untouched, contacted, replied, bounced, stopped, followUpsDue, sentToday,
#   followUpsSent      leads that got each follow-up, per step
#   upcomingFollowUps  [{ position, at, count }] — waiting follow-ups by step and time
#   nextSendAt         when the campaign next sends
# sendWindow: { open, closesAt, nextOpenAt }, or null with no schedule`}
      </CodeBlock>

      <h2 className="font-display text-2xl font-semibold mb-4 mt-10">
        Preview, test send and duplicate
      </h2>
      <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        <li>
          <strong className="text-ink">Preview.</strong>{' '}
          <code className="font-mono">POST /v1/campaigns/preview</code> renders the subject and body
          of any step for a lead, with merge fields filled. Send the draft fields plus{' '}
          <code className="font-mono">campaignId</code>, <code className="font-mono">step</code> and
          either <code className="font-mono">leadId</code> or{' '}
          <code className="font-mono">leadIndex</code> (one of the first three leads). When AI is on
          it makes one real call on your key; <code className="font-mono">skipAi: true</code> shows
          your own text instead, and <code className="font-mono">usesAi</code> in the response says
          whether AI writes that email at send time. With a{' '}
          <code className="font-mono">leadId</code> the preview comes from the mailbox that lead is
          assigned to, and a follow-up keeps the subject the lead&rsquo;s thread really has. The
          response says which mailbox would send it and whether the sender, address or unsubscribe
          link is missing. Nothing is stored.
        </li>
        <li>
          <strong className="text-ink">Test send.</strong>{' '}
          <code className="font-mono">POST /v1/campaigns/:id/test-send</code> with{' '}
          <code className="font-mono">{'{ "to": "you@yourcompany.com" }'}</code> sends that email
          from the first ticked mailbox with a &ldquo;[Test]&rdquo; subject. No lead changes and
          nothing is logged as a send. Its unsubscribe link opens a &ldquo;This was a test
          email&rdquo; page and unsubscribes nobody.
        </li>
        <li>
          <strong className="text-ink">Duplicate.</strong>{' '}
          <code className="font-mono">POST /v1/campaigns/:id/duplicate</code> returns a new draft
          named &ldquo;Copy of &hellip;&rdquo; with the same email, follow-ups, AI settings,
          unsubscribe link, schedule, senders and bounce threshold. Leads, replies and history stay
          with the original.
        </li>
      </ul>

      <h2 className="font-display text-2xl font-semibold mb-4">Editing in the dashboard</h2>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        The campaign builder saves only when you say so, so a half-finished edit never reaches
        leads:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-4">
        <li>
          <strong className="text-ink">Save is always on screen.</strong> The header shows Save, or
          Saved when there&rsquo;s nothing new. Ctrl+S (Cmd+S on a Mac) saves too.
        </li>
        <li>
          <strong className="text-ink">Unsaved edits get a bar</strong> at the bottom of every step
          with Discard and Save, and Next reads &ldquo;Save &amp; next&rdquo;. Nothing saves when
          you click away from a field.
        </li>
        <li>
          <strong className="text-ink">Editing a sending campaign.</strong> It keeps sending the
          saved version until you save. After that, the next email uses the new version, and emails
          already lined up are checked against new send days and hours first.
        </li>
      </ul>
      <p className="text-[15px] leading-relaxed text-ink-muted max-w-2xl mb-10">
        To read exactly what a queued lead will get, open the email from the{' '}
        <Link
          href="/docs/guides/sending-safely-and-domain-health"
          className="text-rust font-semibold"
        >
          Live Queue
        </Link>{' '}
        side panel.
      </p>

      <FaqSection
        items={faqItems}
        title="Campaigns, AI & content quality: questions worth answering up front"
      />
    </div>
  );
}

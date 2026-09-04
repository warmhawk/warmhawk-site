export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * FAQ content for pages that render a <FaqSection>, lifted out of those
 * page.tsx files and into lib/ so lib/llmsTxt.ts can fold the real Q&A into
 * llms-full.txt from a single source. A page.tsx file can only export the
 * Next.js route whitelist (metadata, default, etc.) — anything else fails
 * that route's generated type check at build time — so this content can't
 * live as a named export on the page itself.
 */
export const homeFaqItems: FaqItem[] = [
  {
    question: 'What does "self-hosted" actually mean here?',
    answer:
      'You run WarmHawk on your own server — your own containers, your own Postgres database, your own TLS certificate. WarmHawk never touches your leads or mailbox credentials, because it never sees them.',
  },
  {
    question: 'Is the free tier a real product, or a crippled trial?',
    answer:
      'Tier 0 is the full sending engine over a direct API — same queue, same guardrails, same BYOK AI personalization. There’s no dashboard and no support SLA, but nothing about the sending engine itself is held back.',
  },
  {
    question: 'What’s the difference between Tier 1 and Tier 2?',
    answer:
      'Tier 1 is self-hosted by you — you run the one-command install. Tier 2 has WarmHawk’s founder handle DNS, dedicated IPs, migration, and the deployment itself as a one-time $1,999 setup fee. There’s no retainer — once it’s handed over, you run it day to day, on the same support@warmhawk.com SLA as Tier 1.',
  },
  {
    question: 'If it’s single-tenant, is each of my clients isolated too?',
    answer:
      'Single-tenant describes your account, not each end-client inside it. Your account is fully isolated from every other WarmHawk customer. Inside your own account, client domains currently share one database.',
  },
  {
    question: 'What if I don’t want to manage a server myself?',
    answer:
      'Tier 2 is a one-time, $1,999 setup service — WarmHawk’s founder handles DNS, dedicated IPs, migration, and the deployment itself, then hands you the keys. It’s done-for-you at setup, not run-for-you ongoing: from there you operate it yourself, the same as a Tier 1 customer would.',
  },
  {
    question: 'Is there a guarantee?',
    answer: 'Tier 1 ships with a 30-day money-back guarantee, stated plainly at checkout.',
  },
];

export const pricingFaqItems: FaqItem[] = [
  {
    question: 'Can I switch from monthly to annual later?',
    answer:
      'Yes. Tier 1 (Self-Hosted Pro) toggles monthly ⇄ annual any time from the Stripe Customer Portal — no support ticket, no downtime, no re-onboarding. The annual price is $1,990/yr, about two months free versus paying $199 twelve times.',
  },
  {
    question: 'What happens if I cancel?',
    answer:
      'Your Stripe subscription for the dashboard, support SLA, and managed extras ends at the close of the billing period. The underlying Tier 0 engine is yours to keep running — it is Business Source Licensed software on your own server, not a rented seat.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      "There isn't a time-boxed trial, because Tier 0 already is the free tier — a real, fully-functional sending engine with no card required. Run it indefinitely via API. Tier 1 adds the dashboard and support SLA, backed by a 30-day money-back guarantee instead of a trial clock.",
  },
  {
    question: 'What does the 30-day guarantee actually cover?',
    answer:
      "Tier 1 (Self-Hosted Pro) only. Cancel within 30 days of your first charge and WarmHawk refunds it in full, no questions asked. Tier 2's $1,999 setup fee is a one-time payment for founder-delivered work, not a subscription, so this guarantee doesn't apply to it the same way — email support@warmhawk.com if setup didn't go as expected.",
  },
  {
    question: 'Do you offer invoicing instead of a credit card?',
    answer:
      'Tier 1 and Tier 2 both run through Stripe Checkout, card-based by default — Tier 2’s $1,999 setup fee is a self-serve one-time charge, not a quoted invoice. If you need a custom build beyond Tier 2’s standard setup, that’s scoped directly with the founder and can be invoiced separately.',
  },
  {
    question: "Does 'unlimited users' mean I can host separate clients with isolated data?",
    answer:
      "No — be precise about this one. Unlimited users on Tier 1/2 means your team shares one account with flat permissions, not that each of your agency's clients gets walled-off data from each other. Per-client data isolation is a tracked, unbuilt future item, not a shipped feature.",
  },
  {
    question: 'What if I need something Tier 2 doesn’t cover — a custom feature or integration?',
    answer:
      'That’s a Custom Build engagement, starting at $1,999 one-time — scoped development work for things that don’t exist yet in the product, like a bespoke integration or per-client data isolation. It’s not a listed checkout tier; use the custom-build contact form on the checkout page and WarmHawk’s founder will scope and quote it directly.',
  },
];

export const domainCheckFaqItems: FaqItem[] = [
  {
    question: 'What is SPF/DKIM/DMARC and why do they matter?',
    answer:
      'SPF, DKIM, and DMARC are the three DNS records receiving mail servers check to decide whether your email is legitimate. SPF authorizes sending servers, DKIM signs messages so they can’t be tampered with, and DMARC tells receivers what to do when the first two fail. Missing or misconfigured records are one of the most common reasons cold email lands in spam.',
  },
  {
    question: 'What is RFC 8058 List-Unsubscribe and why does Gmail care about it?',
    answer:
      'RFC 8058 defines a one-click unsubscribe header that lets a mailbox provider unsubscribe a recipient with a single request, no login or landing page required. As of November 2025, Gmail and Yahoo escalated enforcement from throttling to outright rejecting bulk mail that lacks it, so this is no longer optional for any sender at volume.',
  },
  {
    question: 'How often should I check my sending domain?',
    answer:
      'DNS records and blocklist status can change without any action on your part — a DKIM key rotation, a DNS provider migration, or a single spam complaint can knock a domain out of compliance overnight. Check before starting any new sending domain, and re-check anytime deliverability drops unexpectedly.',
  },
  {
    question: 'Is this the same check WarmHawk runs continuously for paying customers?',
    answer:
      'Yes — same underlying SPF/DKIM/DMARC/List-Unsubscribe/blocklist logic. The difference is that this free tool gives you a one-time snapshot, while the paid WarmHawk dashboard runs the identical checks continuously against every sending domain you own and alerts you the moment one starts failing.',
  },
];

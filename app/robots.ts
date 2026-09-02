import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

function isFlagEnabled(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

// Without this, `next build` prerenders robots.txt once, statically, using build-time env (the
// Docker build stage never sets either vs/instantly flag) — see app/vs/instantly/page.tsx's own
// `dynamic` export comment for the full story; same bug, same fix, applies here for the same
// reason getDisallow() below reads those two flags. Computing DISALLOW inside a function (called
// fresh per request, and fresh per test) rather than as a module-level constant is what actually
// makes `dynamic` meaningful here — a top-level `const` would still only read process.env once,
// at module-import time.
export const dynamic = 'force-dynamic';

// Matches app/vs/instantly/page.tsx's own two-flag gate exactly. Disallowed here only until both
// are true — once live it carries its own generateMetadata() index:true instead (belt-and-
// suspenders while gated, not a second independent noindex once published).
function getDisallow(): string[] {
  const vsInstantlyLive =
    isFlagEnabled(process.env.ENABLE_VS_INSTANTLY) &&
    isFlagEnabled(process.env.SEED_PLACEMENT_LIVE_IN_PRODUCTION);
  return [...(vsInstantlyLive ? [] : ['/vs/instantly']), '/api/'];
}

// Named allow rules for AI/answer-engine crawlers (AEO/GEO baseline) — the
// `*` rule below already allows everyone, so these are a signal of intent,
// not a behavior change. A crawler that matches a named user-agent group
// uses ONLY that group's rules, ignoring the `*` group entirely — so every
// entry below repeats DISALLOW, or these crawlers would silently see pages
// the wildcard rule blocks. This same list is used consistently elsewhere
// for the equivalent crawler allow-list.
const AI_CRAWLER_USER_AGENTS = [
  'GPTBot',
  'OAI-SearchBot', // ChatGPT Search's own crawler — separate from GPTBot, not covered by it
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User', // user-triggered fetches, distinct from PerplexityBot's own crawl
  'Google-Extended',
  'CCBot',
  'Applebot-Extended',
  'Bingbot',
  'meta-externalagent', // Meta AI / Llama
  'Amazonbot', // Alexa+ / Rufus
];

export default function robots(): MetadataRoute.Robots {
  const disallow = getDisallow();
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({ userAgent, allow: '/', disallow })),
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}

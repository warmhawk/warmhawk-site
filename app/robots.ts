import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

// /vs/instantly carries its own page-level noindex meta tag too
// (belt-and-suspenders) — see Go-Live Checklist, "Content accuracy."
const DISALLOW = ['/vs/instantly', '/api/'];

// Named allow rules for AI/answer-engine crawlers (AEO/GEO baseline) — the
// `*` rule below already allows everyone, so these are a signal of intent,
// not a behavior change. A crawler that matches a named user-agent group
// uses ONLY that group's rules, ignoring the `*` group entirely — so every
// entry below repeats DISALLOW, or these crawlers would silently see pages
// the wildcard rule blocks. Same list as sibling product jitterflow.io's
// `app/robots.ts`.
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
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({ userAgent, allow: '/', disallow: DISALLOW })),
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}

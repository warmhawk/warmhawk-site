#!/usr/bin/env node
/**
 * Pushes every URL in the live sitemap to the IndexNow API
 * (https://www.bing.com/indexnow), which fans out to every participating
 * search engine (Bing, Yandex, Seznam.cz, Naver, and others) in one POST.
 * No account or API key registration is required — the key is this repo's
 * own self-generated public/<key>.txt file (see public/README if present,
 * or lib/siteConfig.ts's `url`), which IndexNow fetches back from the site
 * to prove domain ownership. The same key file also satisfies Bing
 * Webmaster Tools' "verify by file" ownership check, so nothing else is
 * needed to add warmhawk.com there either.
 *
 * Run after any deploy that changes the URL set (`npm run submit:indexnow`).
 * Reads the sitemap from the live site rather than re-deriving the route
 * list here, so this can never drift from what app/sitemap.ts actually
 * emits.
 *
 * SITE_URL can't literally import lib/siteConfig.ts's `url` (a plain Node
 * ESM script has no TS loader in this repo) — same constraint documented on
 * siteConfig.ts itself for docker-compose.deploy.yml's SMTP_FROM. Pass
 * SITE_URL=https://stage.warmhawk.com to target a non-production sitemap;
 * defaults to the production domain.
 */
const SITE_URL = process.env.SITE_URL || 'https://warmhawk.com';
const INDEXNOW_KEY = '70f56e1a1bd3ea28c998f3c051c26dde';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

function extractUrlsFromSitemap(xml) {
  const matches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
  return [...matches].map((m) => m[1]);
}

async function main() {
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;
  const res = await fetch(sitemapUrl);
  if (!res.ok) {
    throw new Error(`Could not fetch ${sitemapUrl}: ${res.status} ${res.statusText}`);
  }
  const urlList = extractUrlsFromSitemap(await res.text());
  if (urlList.length === 0) {
    throw new Error(`${sitemapUrl} returned no <loc> entries — refusing to submit an empty list.`);
  }

  const body = {
    host: new URL(SITE_URL).host,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList,
  };

  const submitRes = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  // IndexNow returns 200/202 on success; 200 means the key was already known,
  // 202 means it was accepted and will be verified async. Anything else is a
  // real failure worth surfacing in CI.
  if (submitRes.status !== 200 && submitRes.status !== 202) {
    const text = await submitRes.text().catch(() => '');
    throw new Error(
      `IndexNow submission failed: ${submitRes.status} ${submitRes.statusText} ${text}`,
    );
  }

  console.log(`Submitted ${urlList.length} URLs to IndexNow (status ${submitRes.status}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

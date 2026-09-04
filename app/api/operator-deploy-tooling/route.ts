import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter, clientIp } from '@/lib/rateLimit';

/**
 * Serves warmhawk-enterprise-operator's DEPLOY TOOLING only (install.sh, docker-compose.yml, nginx
 * config) to a customer's box -- never that repo's application source, which must never leave
 * WarmHawk's private repo (see app/install/route.ts's module doc for the full design rationale).
 * Fetched by app/install/route.ts's generated script via `curl ... | tar -xz`.
 *
 * UNAUTHENTICATED, ON PURPOSE. This tarball contains no proprietary app code -- just the same shape
 * of installer/compose/nginx scaffolding warmhawk-core-engine already ships in the open. The real
 * gate is the image pull (app/api/registry/token/route.ts), which does require a valid license;
 * handing out the tooling to run `docker compose up` with is useless without a license-backed
 * registry token to actually pull the image it references.
 *
 * Fetches the LATEST GitHub Release of warmhawk/warmhawk-enterprise-operator server-side and streams
 * its `deploy-tooling.tar.gz` asset straight through, using OPERATOR_RELEASE_READ_TOKEN (a token
 * scoped to Contents:Read on that one private repo -- see .env/.env.example). This is the documented
 * way to download a private repo's release asset via the REST API: `GET .../releases/latest` to
 * find the asset's own API `url` (NOT `browser_download_url`, which 404s without a browser session
 * for a private repo), then `GET` that url with `Accept: application/octet-stream` and the same
 * auth header -- GitHub responds with a redirect to a pre-signed, unauthenticated download URL, and
 * `fetch`'s default redirect handling follows it correctly (dropping the Authorization header across
 * the origin change, which is fine -- the signed URL doesn't need it).
 *
 * No GitHub SDK: this repo has no existing GitHub API client to reuse (checked), and one `fetch`
 * call each for the release lookup and the asset download doesn't justify adding a dependency.
 *
 * RATE LIMITED PER SOURCE IP (lib/rateLimit.ts). This route being unauthenticated is exactly why it
 * needs its own flood protection: every hit spends two calls against OPERATOR_RELEASE_READ_TOKEN's
 * shared GitHub API rate limit, and an anonymous flood could exhaust that budget for every real
 * customer install running at the same time.
 */
const OPERATOR_REPO = 'warmhawk/warmhawk-enterprise-operator';
const DEPLOY_TOOLING_ASSET_NAME = 'deploy-tooling.tar.gz';
const GITHUB_API_VERSION = '2022-11-28';

/** A real install/update run fetches this once; generous headroom is for retries after a transient
 *  failure, not repeat legitimate use. */
const rateLimiter = createRateLimiter({ maxRequests: 20, windowMs: 10 * 60 * 1000 });

interface GithubReleaseAsset {
  name: string;
  url: string;
}

interface GithubRelease {
  assets: GithubReleaseAsset[];
}

export async function GET(request: NextRequest) {
  if (!rateLimiter.check(clientIp(request))) {
    return NextResponse.json(
      { error: 'Too many deploy-tooling requests from this address — try again shortly.' },
      { status: 429 },
    );
  }

  const readToken = process.env.OPERATOR_RELEASE_READ_TOKEN;
  if (!readToken) {
    console.error('OPERATOR_RELEASE_READ_TOKEN is not configured — cannot fetch deploy tooling');
    return NextResponse.json(
      { error: 'Deploy tooling is not configured in this environment yet.' },
      { status: 502 },
    );
  }

  const githubHeaders = {
    Authorization: `Bearer ${readToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  };

  let release: GithubRelease;
  try {
    const releaseRes = await fetch(
      `https://api.github.com/repos/${OPERATOR_REPO}/releases/latest`,
      {
        headers: githubHeaders,
        cache: 'no-store',
      },
    );
    if (!releaseRes.ok) {
      // Expected during initial rollout, before the first release carrying this asset exists --
      // a clear 502 rather than a confusing crash for whoever's testing the install flow early.
      console.error(
        `GitHub releases/latest returned ${releaseRes.status} for ${OPERATOR_REPO} -- has a release been published yet?`,
      );
      return NextResponse.json(
        {
          error:
            'No warmhawk-enterprise-operator release is published yet — deploy tooling is unavailable.',
        },
        { status: 502 },
      );
    }
    release = (await releaseRes.json()) as GithubRelease;
  } catch (error) {
    console.error('Failed to reach GitHub releases API for warmhawk-enterprise-operator', error);
    return NextResponse.json(
      { error: 'Could not reach GitHub to fetch deploy tooling.' },
      { status: 502 },
    );
  }

  const asset = release.assets?.find((candidate) => candidate.name === DEPLOY_TOOLING_ASSET_NAME);
  if (!asset) {
    console.error(
      `Latest warmhawk-enterprise-operator release has no ${DEPLOY_TOOLING_ASSET_NAME} asset yet`,
    );
    return NextResponse.json(
      { error: `The latest release has no ${DEPLOY_TOOLING_ASSET_NAME} asset yet.` },
      { status: 502 },
    );
  }

  let assetRes: Response;
  try {
    assetRes = await fetch(asset.url, {
      headers: { ...githubHeaders, Accept: 'application/octet-stream' },
      cache: 'no-store',
    });
  } catch (error) {
    console.error('Failed to download deploy-tooling.tar.gz from GitHub', error);
    return NextResponse.json(
      { error: 'Could not download deploy tooling from GitHub.' },
      { status: 502 },
    );
  }

  if (!assetRes.ok || !assetRes.body) {
    console.error(
      `GitHub asset download returned ${assetRes.status} for ${DEPLOY_TOOLING_ASSET_NAME}`,
    );
    return NextResponse.json(
      { error: 'Could not download deploy tooling from GitHub.' },
      { status: 502 },
    );
  }

  // Streamed straight through -- this file can be tens of MB, no reason to buffer it in memory.
  return new NextResponse(assetRes.body, {
    status: 200,
    headers: { 'Content-Type': 'application/gzip', 'Cache-Control': 'no-store' },
  });
}

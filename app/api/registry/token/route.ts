import { NextRequest, NextResponse } from 'next/server';
import { verifyLicense, derivePublicKeyPem } from '@/lib/license';
import { mintRegistryToken } from '@/lib/registryToken';
import { isCustomerEntitled } from '@/lib/stripeEntitlement';
import { createRateLimiter, clientIp } from '@/lib/rateLimit';

/**
 * `auth.token.realm` for the registry pull-through proxy (`registry` service in
 * docker/docker-compose.deploy.yml) -- the Docker Registry v2 Token Authentication spec
 * (https://distribution.github.io/distribution/spec/auth/token/) target a Docker client hits
 * during `docker login`/`docker pull`: registry:2 first answers 401 with
 * `WWW-Authenticate: Bearer realm="https://warmhawk.com/api/registry/token",
 * service="registry.warmhawk.com",scope="repository:warmhawk/enterprise-operator:pull"`, the
 * client re-requests THIS route with those `service`/`scope` as query params plus HTTP Basic auth,
 * and a `{"token": "..."}` response here is what lets the pull continue.
 *
 * THE CREDENTIAL IS THE EXISTING LICENSE TOKEN -- NO NEW SECRET MINTED PER CUSTOMER. warmhawk-
 * enterprise-operator's own install.sh runs `docker login registry.warmhawk.com -u license
 * --password-stdin`, piping in the same signed license token the customer already has from
 * `--license`/their purchase email. The username is not read at all -- Basic auth requires
 * something in that slot, but this route's whole authorization decision rests on the password,
 * i.e. whatever the customer's installer sent as the license token.
 *
 * STRICT verification, deliberately NOT `authenticateLicenseToken` (the lenient variant
 * `/api/portal`/`/api/license/refresh` use, which intentionally still authenticates an EXPIRED
 * token -- see that function's own doc comment for why that leniency is correct THERE). A pull
 * credential has no equivalent "let a lapsed customer reach the page that fixes the lapse" case: an
 * expired license must not keep pulling images, full stop. `verifyLicense` is the one that actually
 * rejects on expiry.
 *
 * `scope` is read only to log a mismatch, never to decide what gets granted -- see
 * lib/registryToken.ts's module doc ("FIXED ACCESS, NOT CALLER-SUPPLIED"). Every valid license gets
 * the exact same grant: pull access to the one private image this whole design exists to gate.
 *
 * A valid, unexpired signature is also re-checked live against Stripe (lib/stripeEntitlement.ts)
 * before minting -- defense-in-depth so a cancelled/refunded subscription stops new pulls within
 * one token TTL, rather than only once the license's own (much longer) `expiresAt` arrives.
 */

/** Matches lib/registryToken.ts's GRANTED_ACCESS exactly (repository:name:actions, comma-joined
 *  per the token-auth spec's scope grammar) -- kept here rather than imported since it is a
 *  request-log-comparison string, not an authorization input; the real fixed grant lives solely in
 *  lib/registryToken.ts. */
const GRANTED_SCOPE = 'repository:warmhawk/enterprise-operator:pull';

/** Mirrors lib/registryToken.ts's own TTL for the `expires_in` field the spec recommends
 *  returning alongside the token -- not re-exported from there to keep that module's internals
 *  private; if the two ever drift, lib/registryToken.test.ts's round-trip test still proves the
 *  token's own `exp` claim is what actually governs. */
const REGISTRY_TOKEN_TTL_SECONDS = 300;

/** Defense-in-depth flood protection, not a primary control -- install.sh/update.sh's docker
 *  login+pull can legitimately hit this route several times per run (once per layer/retry), and
 *  the real e2e CI tier exercises it repeatedly across two install passes. Generous on purpose. */
const rateLimiter = createRateLimiter({ maxRequests: 60, windowMs: 5 * 60 * 1000 });

export async function GET(request: NextRequest) {
  if (!rateLimiter.check(clientIp(request))) {
    return NextResponse.json(
      { error: 'Too many registry token requests from this address — try again shortly.' },
      { status: 429 },
    );
  }

  const { searchParams } = request.nextUrl;
  const service = searchParams.get('service') ?? '';
  const requestedScope = searchParams.get('scope');

  if (requestedScope && requestedScope !== GRANTED_SCOPE) {
    // Never fatal -- registry:2 itself decided what scope to ask for, and we grant the same fixed
    // access regardless. Logged so a future reader can tell a real mismatch (misconfigured
    // REGISTRY_AUTH_TOKEN_SERVICE, a second image someone forgot to wire up here) from noise.
    console.warn('Registry token request asked for a scope this proxy never grants', {
      requestedScope,
      granted: GRANTED_SCOPE,
    });
  }

  const password = extractBasicAuthPassword(request.headers.get('authorization'));
  if (!password) {
    return NextResponse.json(
      { error: 'A WarmHawk license token is required as the Basic-auth password.' },
      { status: 401 },
    );
  }

  const licenseSigningPrivateKeyPem = process.env.LICENSE_SIGNING_PRIVATE_KEY;
  if (!licenseSigningPrivateKeyPem) {
    console.error(
      'LICENSE_SIGNING_PRIVATE_KEY is not configured — cannot verify a registry pull license',
    );
    return NextResponse.json(
      { error: 'Registry authentication is not configured in this environment yet.' },
      { status: 503 },
    );
  }

  const licenseResult = verifyLicense(password, derivePublicKeyPem(licenseSigningPrivateKeyPem));
  if (!licenseResult.valid) {
    return NextResponse.json(
      { error: 'That license is invalid or expired — cannot authorize a registry pull.' },
      { status: 401 },
    );
  }

  const entitled = await isCustomerEntitled(licenseResult.payload.customerId);
  if (!entitled) {
    return NextResponse.json(
      {
        error:
          "This license's subscription is no longer active — cannot authorize a registry pull.",
      },
      { status: 401 },
    );
  }

  const registryTokenSigningPrivateKeyPem = process.env.REGISTRY_TOKEN_SIGNING_PRIVATE_KEY;
  if (!registryTokenSigningPrivateKeyPem) {
    console.error(
      'REGISTRY_TOKEN_SIGNING_PRIVATE_KEY is not configured — cannot mint a registry token',
    );
    return NextResponse.json(
      { error: 'Registry authentication is not configured in this environment yet.' },
      { status: 503 },
    );
  }

  const token = mintRegistryToken({
    subject: licenseResult.payload.licenseKey,
    service,
    privateKeyPem: registryTokenSigningPrivateKeyPem,
  });

  // `token` and `access_token` carry the identical value -- the spec allows either key name
  // because different Docker client versions historically looked for different ones; sending both
  // costs nothing and avoids caring which the customer's Docker happens to be.
  return NextResponse.json({
    token,
    access_token: token,
    expires_in: REGISTRY_TOKEN_TTL_SECONDS,
    issued_at: new Date().toISOString(),
  });
}

/** Basic auth's password is the license token; the username slot is unread (install.sh sends the
 *  literal string `license`, but nothing here depends on that). Returns undefined for anything that
 *  isn't well-formed `Basic <base64(user:pass)>`. */
function extractBasicAuthPassword(authorizationHeader: string | null): string | undefined {
  if (!authorizationHeader) return undefined;
  const [scheme, encodedCredentials] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'basic' || !encodedCredentials) return undefined;

  let decoded: string;
  try {
    decoded = Buffer.from(encodedCredentials, 'base64').toString('utf8');
  } catch {
    return undefined;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return undefined;
  return decoded.slice(separatorIndex + 1) || undefined;
}

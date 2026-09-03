import { createSign, createVerify, createPublicKey, randomUUID } from 'node:crypto';

/**
 * Mints and verifies short-lived RS256 JWTs for the Docker Registry v2 Token Authentication
 * protocol (https://distribution.github.io/distribution/spec/auth/token/) -- the
 * `auth.token.realm` target a Docker client hits during `docker login`/`docker pull` against the
 * registry pull-through proxy (`registry` service in docker/docker-compose.deploy.yml), per that
 * spec's standard flow: registry responds 401 with a `WWW-Authenticate: Bearer realm="...",
 * service="...",scope="..."` challenge, the client re-requests here with those query params plus
 * Basic auth, and this module's `mintRegistryToken` is what turns a verified license into the JWT
 * `app/api/registry/token/route.ts` hands back.
 *
 * SEPARATE KEYPAIR FROM `lib/license.ts` -- DELIBERATE. Signed with
 * `REGISTRY_TOKEN_SIGNING_PRIVATE_KEY`, never `LICENSE_SIGNING_PRIVATE_KEY`. A registry token and a
 * license token answer different questions ("can this bearer pull this one image right now" vs
 * "does this customer hold a currently-valid WarmHawk license") and carry different blast radii if
 * a signing key is ever compromised -- sharing one key here would mean a registry-token leak also
 * forges licenses, and vice versa. A verified license token is still the THING BEING CHECKED before
 * one of these gets minted (see the route: it calls lib/license.ts's `verifyLicense` first) -- it
 * just isn't what's being signed. PEM-from-env-var handling deliberately matches
 * `lib/license.ts`/`app/api/stripe/webhook/route.ts`'s own convention: the caller reads
 * `process.env.REGISTRY_TOKEN_SIGNING_PRIVATE_KEY` and passes the PEM straight in here, no
 * unescaping step -- despite `.env/.env.example`'s LICENSE_SIGNING_PRIVATE_KEY comment describing a
 * literal-`\n` convention, no code in this repo actually unescapes one; both `.env.example` and
 * `.env.local` carry the real, quoted, multi-line PEM as-is (dotenv and `bash source` both parse
 * that correctly), and that is the convention this module follows too.
 *
 * FIXED ACCESS, NOT CALLER-SUPPLIED. `mintRegistryToken` takes no `access`/`scope` parameter --
 * every token this module ever mints grants exactly `GRANTED_ACCESS` below, regardless of what
 * scope a Docker client requested. There is exactly one image behind this registry proxy today and
 * exactly one thing a customer's box is ever allowed to do with it (pull, never push); baking that
 * in here means a caller -- including a route handler that got a wider `scope=` query param from an
 * untrusted request -- cannot accidentally widen what a minted token grants. Serving a second image
 * through this proxy is a deliberate change to this file, not a runtime parameter.
 */

/** 5 minutes: long enough to cover one `docker pull`'s token lifetime (registry:2 re-requests a
 *  fresh token per pull anyway), short enough that a captured token is worthless soon after. */
const TOKEN_TTL_SECONDS = 300;

/** The one and only grant this module will ever mint. See module doc's "FIXED ACCESS" note. */
const GRANTED_ACCESS: ReadonlyArray<RegistryTokenAccessEntry> = [
  { type: 'repository', name: 'warmhawk/enterprise-operator', actions: ['pull'] },
];

/** Must exactly match docker/docker-compose.deploy.yml's `registry` service's
 *  REGISTRY_AUTH_TOKEN_ISSUER -- registry:2 rejects any token whose `iss` claim doesn't match its
 *  own configured issuer. Exported so that comment can point back here as the source of truth
 *  instead of the two drifting independently. */
export const REGISTRY_TOKEN_ISSUER = 'warmhawk.com';

/** node:crypto's name for what the JWT header calls `RS256`. */
const SIGNATURE_ALGORITHM = 'RSA-SHA256';

export interface RegistryTokenAccessEntry {
  type: string;
  name: string;
  actions: string[];
}

export interface RegistryTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  nbf: number;
  iat: number;
  jti: string;
  access: RegistryTokenAccessEntry[];
}

export interface MintRegistryTokenOptions {
  /** Identity to carry in the JWT's `sub` claim -- this module signs whatever the caller passes
   *  through, so the caller (the route handler, after it has already verified the license) is the
   *  one place responsible for using a value that actually identifies who authenticated, e.g. the
   *  license's `licenseKey`. Not itself an authorization input: `access` is always `GRANTED_ACCESS`
   *  no matter what this is. */
  subject: string;
  /** The `service` query param from the token request, echoed into `aud` per the token-auth spec --
   *  this is what registry:2's REGISTRY_AUTH_TOKEN_SERVICE compares the token against. */
  service: string;
  /** PEM-encoded RSA private key, i.e. `process.env.REGISTRY_TOKEN_SIGNING_PRIVATE_KEY`. */
  privateKeyPem: string;
}

function base64UrlEncodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

/** Signs a fixed-access registry pull token. Called only from
 *  `app/api/registry/token/route.ts`, and only after that route has independently verified the
 *  caller presented a currently-valid WarmHawk license -- this function itself performs no
 *  authorization check of its own, it just signs what it's told. */
export function mintRegistryToken({
  subject,
  service,
  privateKeyPem,
}: MintRegistryTokenOptions): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { typ: 'JWT', alg: 'RS256' };
  const payload: RegistryTokenPayload = {
    iss: REGISTRY_TOKEN_ISSUER,
    sub: subject,
    aud: service,
    exp: nowSeconds + TOKEN_TTL_SECONDS,
    nbf: nowSeconds,
    iat: nowSeconds,
    jti: randomUUID(),
    access: GRANTED_ACCESS as RegistryTokenAccessEntry[],
  };

  const signingInput = `${base64UrlEncodeJson(header)}.${base64UrlEncodeJson(payload)}`;

  const signer = createSign(SIGNATURE_ALGORITHM);
  signer.update(signingInput);
  signer.end();
  const encodedSignature = signer.sign(privateKeyPem).toString('base64url');

  return `${signingInput}.${encodedSignature}`;
}

export type RegistryTokenVerificationResult =
  | { valid: true; expired: false; payload: RegistryTokenPayload }
  | { valid: false; expired: true; payload: RegistryTokenPayload; reason: 'expired' }
  | { valid: false; expired: false; payload: null; reason: 'invalid_signature' | 'malformed' };

/** Verifies a registry token against the matching public key -- used by this repo's own tests
 *  proving the round trip (see lib/registryToken.test.ts). Production verification happens
 *  entirely inside the `registry` service (registry:2's own token-auth middleware, configured via
 *  REGISTRY_AUTH_TOKEN_ROOTCERTBUNDLE -- see docker/docker-compose.deploy.yml), which never runs
 *  this repo's code and never sees the private key. Mirrors `lib/license.ts`'s `verifyLicense`
 *  shape deliberately, for the same reason that file's does: `valid`/`expired`/`payload` need to be
 *  three independently-inspectable facts, not folded into one boolean a caller has to reverse
 *  engineer. */
export function verifyRegistryToken(
  token: string,
  publicKeyPem: string,
): RegistryTokenVerificationResult {
  const parts = token.split('.');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (parts.length !== 3 || !encodedHeader || !encodedPayload || !encodedSignature) {
    return { valid: false, expired: false, payload: null, reason: 'malformed' };
  }

  let payload: RegistryTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as RegistryTokenPayload;
  } catch {
    return { valid: false, expired: false, payload: null, reason: 'malformed' };
  }

  let signatureValid: boolean;
  try {
    const verifier = createVerify(SIGNATURE_ALGORITHM);
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();
    const signatureBuffer = Buffer.from(encodedSignature, 'base64url');
    signatureValid = verifier.verify(publicKeyPem, signatureBuffer);
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    return { valid: false, expired: false, payload: null, reason: 'invalid_signature' };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp < nowSeconds) {
    return { valid: false, expired: true, payload, reason: 'expired' };
  }

  return { valid: true, expired: false, payload };
}

/** Derives the PEM public half from the signing private key -- identical technique to
 *  `lib/license.ts`'s own `derivePublicKeyPem` (RSA private keys embed their own public
 *  modulus/exponent, so this is a pure local derivation, no I/O). Duplicated rather than imported
 *  from `lib/license.ts`: this module's whole reason to exist is to be independent of that file's
 *  key material (see module doc's "SEPARATE KEYPAIR" note), and reaching across to import a
 *  license.ts helper -- however generic -- would read as exactly the kind of coupling between the
 *  two keys this Task was designed to avoid. Ops uses this once, by hand, when provisioning
 *  REGISTRY_TOKEN_SIGNING_PRIVATE_KEY, to also produce the public PEM that
 *  docker-compose.deploy.yml's `registry` service needs mounted at
 *  REGISTRY_AUTH_TOKEN_ROOTCERTBUNDLE -- see that file's own comment. */
export function derivePublicKeyPem(privateKeyPem: string): string {
  return createPublicKey(privateKeyPem).export({ type: 'spki', format: 'pem' }).toString();
}

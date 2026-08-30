/**
 * TEST KEYPAIR — DO NOT USE IN PRODUCTION.
 *
 * This is the exact keypair checked into this repo's .env/.env.example as
 * LICENSE_SIGNING_PRIVATE_KEY and into warmhawk-enterprise-operator's
 * .env.example as the matching LICENSE_PUBLIC_KEY_PEM — so tests that use it
 * prove the two repos' checked-in test values actually interoperate, not just
 * that *some* keypair round-trips. Rotated 2026-08-24 — keep in lockstep with
 * both .env.example files if either rotates again.
 *
 * SHA-256 fingerprint of the public half:
 *   af961413:bdcf867f:c1641985:6528d63f:949cbf40:cd24711f:ee6c8fee:c119d78a
 *
 * Lives here, rather than inline in one test, because three suites now need
 * it: lib/license.test.ts (round-trip), app/api/portal/route.test.ts and
 * app/api/license/refresh/route.test.ts (both authenticate a real token).
 * `.gitleaks.toml` allowlists this key by fingerprint.
 */
export const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDAD70c7wdMUiPO
Bt8EBNLROh4BAhl+0xO1pUKiMDh8Tc7e4w+/LRciAft4yc9Stzi4mM0E5NGvKKvN
wwwG2ojO3o3ri7+U59oAsz/HQKyd4MT0C836zM+7W7iI0+6iUFKosIMesgOCOtyc
ePaHiNZeZufPWy+2kXNBsfdDc48k429W9sV0GUasK8p2nZEn7EZxHZxSc3Nnt7k+
A+UUmNbiNfeyp6V8fmoFJr/KCaCbZZMavHMFEWMULjWKgzLbvKgIqWH2ydK4cm6B
X03jarzrV5t+ujcDcPtAtAIuMoWY6x7dAf9YqD5zCxv3MwyH8gV70rK3WznWIxUl
gT7pttWpAgMBAAECggEABpMGi6NaY6aqv2S7uBKMZXYtkwyPf/U5bYrMMqr4/mpK
0uINxsldy0x3+PNbIGJeTVVWEt0pTB6VvCVsngRxHlGyC0M3A66CQOr7dSmpCJhD
1A3Eyn+9yAfnxtYOvlztA2vtXrAQ9i5N7gfaLbTSdhwXXC34WDHEGTALSuWjzss9
P8KsrIQHnM2GW+ISb28C5arU5FGd14eQ10XouJHSIaAONVbl40iRkZd30hwDR1I1
0eMoBtcTrlY8T84HnbejPI7ukVLNi9YJXJcT0tjfl1DTA7+PWT+GFwVX4+U7LK0K
GKRnG2zLxVK6UYDm33XwcO3gxWkbb/scaBix6rqVvQKBgQDlKzv/nkwh4kKff43+
gQ1bRjJR2BfFQ+fPXZ2pUfD4Zn4bK3fJf1dtuNyfopHGXi3pT+ZjB8JoSmqSLMdQ
5/yrXoyfWkVGOYsrcS49T83uH5L4ZEgmJKVN65cc5bz+bRGEIqg4jBULTEO9vrri
9rtvZ353jCq7y45hfRPq1yW8PQKBgQDWjE1t9kRD4xYGbiReREUiOBz8qycbME0Z
5b7iZ68k0BXAYGAtoP95E3Beri1alg6pqU/YLRxj2Lp/aNr7d/aVujwU8d4mUvWp
3c+kpkVLV6YKFu2SrlKbqwa7tN2vKvVU8txOoImjL/zvQ1BPdSx8oqawzMASd2go
jQK/xvz53QKBgHe63t3uFlidnbE3MziEtDW7tw6Ll9+4WqQ8hOKxrPQamEgZrbvY
jBUHQD0m8oJxMgtzcyrKIwfZ2VQFkRz0F05xV4bp4seNyOgpeb8Ossh2NpMP0aIc
A0FylMDERrmmwkAG21yv007TyZCY1Ys+3S6XI7vRv4HeF8VXU9CeF1kBAoGBAJS4
eu/vltCMOHdKoDEsF9Qpm4ZWSexh5gA+rrwYbWMSTxGkfOcERDM0k18+U7gIbq+S
6wMJ+jUIRfcNw0YvmSGfEAjgxEJCnYIbfNVAYKZiYnl5/UMBTcgUnL0/GbBUEe3J
z4c9Z0tUd3uPaLs7mRPoV64UsEvcs7nwTWiM0k2NAoGAUV2rE/ywMlBEbhhKsRrE
yYUyoa2ncLVcqVPmMGQToXYZT59FO0mMkDB9H3Fn02L+PbFtrLihUDGbT21sBHRJ
FIijSEeVV3i804h2/TdZXHeGFyvYcYsRLMfJLUxpqvzBBLfqA8bAZxbG5OJzv8TQ
VzPzytgxJL5KV2vPHAwoyRM=
-----END PRIVATE KEY-----`;

export const TEST_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwA+9HO8HTFIjzgbfBATS
0ToeAQIZftMTtaVCojA4fE3O3uMPvy0XIgH7eMnPUrc4uJjNBOTRryirzcMMBtqI
zt6N64u/lOfaALM/x0CsneDE9AvN+szPu1u4iNPuolBSqLCDHrIDgjrcnHj2h4jW
Xmbnz1svtpFzQbH3Q3OPJONvVvbFdBlGrCvKdp2RJ+xGcR2cUnNzZ7e5PgPlFJjW
4jX3sqelfH5qBSa/ygmgm2WTGrxzBRFjFC41ioMy27yoCKlh9snSuHJugV9N42q8
61ebfro3A3D7QLQCLjKFmOse3QH/WKg+cwsb9zMMh/IFe9Kyt1s51iMVJYE+6bbV
qQIDAQAB
-----END PUBLIC KEY-----`;

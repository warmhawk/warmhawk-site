#!/usr/bin/env bash
set -euo pipefail

# generate-license-keypair.sh — run ONCE, by the founder, to produce the real production RSA
# keypair for WarmHawk license issuance/verification.
#
# This repo (warmhawk-site) is the sole owner of the live Stripe webhook and the RSA PRIVATE
# signing key (see lib/license.ts's module doc for why — the spec's Support Model names this repo
# as the one piece of billing infrastructure WarmHawk operates centrally). The corresponding PUBLIC
# key ships inside warmhawk-enterprise-operator, which only ever verifies.
#
# Usage:
#   ./scripts/generate-license-keypair.sh [output-dir]
#
# Defaults to writing into ./keys/ (gitignored — never commit real key material). Prints the two
# env var lines you need to paste into each repo's deployment secrets, plus the public key's
# SHA-256 fingerprint so you can confirm both sides match without ever comparing the private key
# itself.

OUT_DIR="${1:-./keys}"
mkdir -p "$OUT_DIR"

PRIVATE_KEY_PATH="$OUT_DIR/license-signing-private.pem"
PUBLIC_KEY_PATH="$OUT_DIR/license-verify-public.pem"

if [ -e "$PRIVATE_KEY_PATH" ]; then
  echo "Refusing to overwrite existing $PRIVATE_KEY_PATH — remove it first if you really mean to" \
    "generate a new keypair (this invalidates every license signed with the old one)." >&2
  exit 1
fi

echo "Generating a 2048-bit RSA keypair..."
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$PRIVATE_KEY_PATH"
openssl rsa -pubout -in "$PRIVATE_KEY_PATH" -out "$PUBLIC_KEY_PATH" 2>/dev/null

FINGERPRINT=$(openssl pkey -pubin -in "$PUBLIC_KEY_PATH" -outform DER 2>/dev/null | openssl sha256 | awk '{print $2}')

# .env files need a single-line value — escape real newlines as literal \n, unescaped by both
# repos' code (lib/license.ts here, lib/license/verify.ts in warmhawk-enterprise-operator) before
# use, same convention as their existing .env.example comments.
escape_for_env() {
  awk 'BEGIN{ORS="\\n"} {print}' "$1" | sed 's/\\n$//'
}

PRIVATE_ESCAPED="$(escape_for_env "$PRIVATE_KEY_PATH")"
PUBLIC_ESCAPED="$(escape_for_env "$PUBLIC_KEY_PATH")"

cat <<EOF

Done. Wrote:
  $PRIVATE_KEY_PATH  (PRIVATE — never commit, never leaves this repo's deployment secrets)
  $PUBLIC_KEY_PATH   (public — safe to share, ships inside warmhawk-enterprise-operator)

Public key SHA-256 fingerprint (use this to confirm both repos got the matching key, without
ever needing to compare the private key itself):
  $FINGERPRINT

Next steps:
  1. In warmhawk-site's deployment secrets (Coolify-managed env, NOT committed to .env.example),
     set:
       LICENSE_SIGNING_PRIVATE_KEY="$PRIVATE_ESCAPED"

  2. In warmhawk-enterprise-operator's deployment secrets, set:
       LICENSE_PUBLIC_KEY_PEM="$PUBLIC_ESCAPED"

  3. Delete $OUT_DIR (or move it somewhere outside any git working tree) once both values are
     safely stored in each deployment's secret manager — this script never stores them anywhere
     else, and they should not linger on disk longer than needed to copy them over.

Both repos' .env.example files carry an OBVIOUSLY TEST-ONLY keypair (clearly commented as such)
so local dev and CI can sign+verify a real token end-to-end without running this script first.
Never reuse that test keypair in production — generate a fresh one with this script instead.
EOF

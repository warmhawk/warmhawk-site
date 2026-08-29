# Same shape as jitterflow-core-app's docker/Dockerfile.admin (also a
# dynamic Next.js app deployed via the "own repo, git-pull" pattern, not a
# static export) — builder stage runs the real build + `npm prune
# --omit=dev`, runtime stage copies only what `next start` needs. Replaces
# Coolify's Nixpacks buildpack (decommissioned 2026-08-25): this repo has no
# Dockerfile of its own before this, since Coolify built it from git source
# directly.
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder
WORKDIR /app
# Not needed to build/run this app — installed only to pick up whatever
# openssl (libssl3/libcrypto3) Alpine's repos currently carry, patching the
# base image's baked-in copy. Matches every Dockerfile in jitterflow-core-app.
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time placeholders only, same as this repo's retired
# .github/workflows/ci.yml and single-app-deploy.ts's own `build` CI-gate
# workflow — lib/stripe.ts's getStripeClient() is lazy (reads
# process.env.STRIPE_SECRET_KEY only when a route handler actually calls
# it), so `next build`'s static analysis never needs a real key, but every
# other build path in this repo already sets these defensively and this
# should not be the one exception.
ARG STRIPE_SECRET_KEY=sk_test_placeholder
ARG STRIPE_WEBHOOK_SECRET=whsec_placeholder
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
ENV STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET

RUN npm run build && npm prune --omit=dev

FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS runtime
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# The base image's bundled npm CLI (not our own dependency tree — `npm
# prune` never touches it) carries several HIGH/CRITICAL CVEs in its own
# vendored deps. This image only ever runs Next's CLI entry file directly
# via `node`, never `npm`, so it's dead weight — remove it rather than carry
# the CVEs. Same as jitterflow-core-app's Dockerfile.admin/Dockerfile.web.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

# Drop root — the node:alpine base ships a ready-made unprivileged user.
USER node

EXPOSE 4600
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "4600"]

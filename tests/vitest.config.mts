import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// This config file lives in tests/, one level below the actual project root
// (2026-08-28 root-folder cleanup) — every path below is anchored to
// `rootDir`, the real repo root, not `__dirname`, so test discovery
// (`include`/`exclude`, run from the repo's app/lib/components trees) and
// the `@/*` alias (must match tsconfig.json's own `paths["@/*"] = ["./*"]`,
// repo-root-relative) both still resolve correctly from their new location.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export default defineConfig({
  // The repo's tsconfig.json intentionally sets "jsx": "preserve" (Next.js's
  // SWC compiler does the real JSX transform for the app itself), but
  // Vite/esbuild refuses to transform JSX when it sees "preserve" unless
  // told otherwise here — this does not change how `next build` compiles.
  oxc: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    root: rootDir,
    environment: 'jsdom',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**'],
    // Explicit absolute path, not the bare './vitest.setup.ts' this repo used
    // pre-move: `root` above is `rootDir` (so include/exclude/the `@` alias
    // resolve against the real project root), but Vitest resolves
    // `setupFiles` against `root` too — a bare relative path here would look
    // for the file at the repo root, not next to this config in tests/.
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
  },
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
});

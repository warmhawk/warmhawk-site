import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    environment: 'jsdom',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': __dirname,
    },
  },
});

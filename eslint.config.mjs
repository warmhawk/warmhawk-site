import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  {
    // scripts/load-env.js is CJS and tests/human-journeys/human.config.ts require()'s it
    // (must run before Playwright forks workers, same convention used elsewhere in this product
    // family's scripts/load-env.js — see that repo's eslint.config.mjs for the identical exception).
    files: ['scripts/load-env.js', 'tests/human-journeys/human.config.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];

export default eslintConfig;

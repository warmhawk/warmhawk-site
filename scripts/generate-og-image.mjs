#!/usr/bin/env node
/**
 * Rasterizes public/og-image.svg to public/og-image.png at exactly
 * 1200x630 (the standard Open Graph / Twitter Card image size).
 *
 * Most social platforms (Facebook, Twitter/X, LinkedIn, Slack unfurls)
 * don't reliably render SVG Open Graph images, so this produces a real
 * raster fallback that matches the on-brand SVG 1:1. Re-run this script
 * (`npm run generate:og-image`) any time public/og-image.svg changes.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'og-image.svg');
const pngPath = path.join(publicDir, 'og-image.png');

const WIDTH = 1200;
const HEIGHT = 630;

async function main() {
  const svg = readFileSync(svgPath);

  const image = sharp(svg, { density: 300 })
    .resize(WIDTH, HEIGHT, {
      fit: 'contain',
      background: { r: 250, g: 245, b: 238, alpha: 1 }, // #faf5ee, matches SVG bg
    })
    .flatten({ background: { r: 250, g: 245, b: 238 } }); // drop alpha channel — some unfurl clients mishandle it

  await image.png({ compressionLevel: 9 }).toFile(pngPath);

  const meta = await sharp(pngPath).metadata();
  if (meta.width !== WIDTH || meta.height !== HEIGHT) {
    throw new Error(`Generated PNG is ${meta.width}x${meta.height}, expected ${WIDTH}x${HEIGHT}`);
  }
  if (meta.format !== 'png') {
    throw new Error(`Generated file is not a PNG (got ${meta.format})`);
  }

  console.log(`Wrote ${pngPath} (${meta.width}x${meta.height}, ${meta.format})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

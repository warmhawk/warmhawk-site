import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/siteConfig';

// icon.svg (this directory) already gives every modern browser a favicon via Next's
// automatic metadata-file convention — no <link> tag needed for that. apple-icon.png
// (180x180, same mark, rendered from icon.svg) covers iOS "Add to Home Screen", which
// ignores SVG. This manifest is the third piece: Android's "Add to Home Screen" and any
// theme-color chrome that reads from a web app manifest rather than <meta name="theme-color">.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#F3EEE1', // tailwind.config.ts cream.DEFAULT
    theme_color: '#B94B27', // tailwind.config.ts rust.DEFAULT — matches icon.svg's background
    icons: [
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}

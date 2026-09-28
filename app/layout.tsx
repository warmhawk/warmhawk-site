import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Analytics } from '@/components/Analytics';
import { siteConfig } from '@/lib/siteConfig';
import { organizationSchema } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Self-hosted cold email infrastructure`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    siteName: siteConfig.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: siteConfig.twitter,
  },
};

// Self-hosted instead of a Google Fonts @import: the import chained two extra third-party round
// trips in front of the hero, which holds the home page's LCP element.
//
// next/font/local, not next/font/google: Google serves Windows/Linux Chrome *hinted* files, but
// next/font/google downloads the unhinted ones, and on Linux the hinted metrics are what the nav
// was laid out against — unhinted, "Domain Check" and the Tier 1 button wrap at 1440px. The files
// in app/fonts are Google's hinted latin subsets (OFL-1.1, fonts.gstatic.com v20/v38); Apple
// platforms ignore hinting, so they render these exactly as before. Weights are listed one by one,
// not as a 100–900 range, to keep Google's matching: e.g. `font-bold` on Inter resolves to 600.
const fraunces = localFont({
  src: [
    { path: './fonts/fraunces-latin.woff2', weight: '600', style: 'normal' },
    { path: './fonts/fraunces-latin.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-fraunces',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});
const inter = localFont({
  src: [
    { path: './fonts/inter-latin.woff2', weight: '400', style: 'normal' },
    { path: './fonts/inter-latin.woff2', weight: '500', style: 'normal' },
    { path: './fonts/inter-latin.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
});
const plexMono = localFont({
  src: [
    { path: './fonts/ibm-plex-mono-500-latin.woff2', weight: '500', style: 'normal' },
    { path: './fonts/ibm-plex-mono-600-latin.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-plex-mono',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }}
        />
        <Nav />
        <main>{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DocsSidebar } from '@/components/DocsSidebar';
import { getPrevNext, getBreadcrumbTrail } from '@/lib/docsNav';
import { breadcrumbSchema } from '@/lib/seo';

/**
 * Two-column docs shell — sidebar nav + article content — matching the
 * artifact's `.docs-shell` (`warmhawk-redesign V2 Small update.html`,
 * `#page-docs`). The `/docs`
 * index itself keeps its existing full-width card-grid layout (it's an
 * overview/directory page, not an article), so this only wraps everything
 * *underneath* it.
 *
 * Prev/next footer nav is computed here from `docsFlatOrder` + the current
 * pathname rather than hand-added to each of the 19 article pages, so the
 * reading order has one source of truth and can't drift out of sync with
 * the sidebar.
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/docs') {
    return <>{children}</>;
  }

  const { prev, next } = getPrevNext(pathname);
  const breadcrumbTrail = getBreadcrumbTrail(pathname);

  return (
    <div className="wrap py-10 md:py-14 flex flex-col md:flex-row gap-8 md:gap-12">
      {breadcrumbTrail.length > 0 && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(breadcrumbTrail)) }}
        />
      )}
      <DocsSidebar />
      <div className="min-w-0 flex-1 border-t border-border pt-8 md:border-t-0 md:pt-0 md:border-l md:pl-12 md:border-border">
        {children}
        {(prev || next) && (
          <div className="flex items-center justify-between mt-14 pt-6 border-t border-border text-[13.5px] font-semibold">
            {prev ? (
              <Link href={prev.href} className="text-rust hover:text-rust-hover">
                ← {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={next.href} className="text-rust hover:text-rust-hover">
                {next.title} →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

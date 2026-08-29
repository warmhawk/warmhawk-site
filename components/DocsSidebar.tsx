'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { docsSections } from '@/lib/docsNav';

/**
 * Matches the artifact's `.docs-sidebar`/`.docs-nav` (see
 * "warmhawk-redesign V2 Small update.html" `#page-docs`): grouped mono
 * uppercase labels, a rust-filled pill on the current page, sticky on
 * desktop and stacked full-width above the content on mobile (this repo's
 * Nav isn't itself sticky, unlike the artifact's, so this sticks to the
 * viewport top directly rather than offsetting by a header height).
 *
 * Responsive fix: below `md`, docs/layout.tsx stacks this sidebar directly
 * above the article (a plain flex-column reflow, not a bug on its own), but
 * every section was always fully expanded — six section headings and ~20
 * links a phone visitor had to scroll past before reaching the page they
 * came to read. Below `md` this is now collapsed into a `<details>`
 * accordion (same zero-JS idiom as Nav.tsx's mobile menu and FaqSchema's
 * accordion) whose closed summary already names the current page, so the
 * sidebar takes one line instead of a full screen; `md`+ renders the same
 * link list uncollapsed, unchanged from before.
 */
export function DocsSidebar() {
  const pathname = usePathname();
  const currentLink = docsSections.flatMap((section) => section.links).find((link) => link.href === pathname);

  const sections = (
    <nav>
      {docsSections.map((section) => (
        <div key={section.label} className="mb-5">
          <div className="label text-ink-muted mb-2 mt-5 first:mt-0">{section.label}</div>
          <ul>
            {section.links.map((link) => {
              const current = pathname === link.href;
              return (
                <li key={link.href} className="mb-0.5">
                  <Link
                    href={link.href}
                    className={
                      'block rounded-lg px-2.5 py-2 text-[13.5px] transition-colors ' +
                      (current
                        ? 'bg-rust text-rust-fg font-semibold'
                        : 'text-ink-muted hover:bg-cream-elevated hover:text-ink')
                    }
                  >
                    {link.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <aside className="w-full md:w-[240px] flex-none md:sticky md:top-8 md:max-h-[calc(100vh-4rem)] md:overflow-y-auto pb-6 md:pb-10">
      <details className="md:hidden group mb-2 rounded-xl border border-border bg-paper">
        <summary
          className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden font-semibold text-sm text-ink"
        >
          <span>{currentLink ? currentLink.title : 'Docs menu'}</span>
          <svg
            className="h-3.5 w-3.5 flex-none text-ink-muted transition-transform group-open:rotate-180"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          >
            <path d="M5 7.5l5 5 5-5" />
          </svg>
        </summary>
        <div className="px-4 pb-3 pt-1 border-t border-border">{sections}</div>
      </details>
      <div className="hidden md:block">{sections}</div>
    </aside>
  );
}

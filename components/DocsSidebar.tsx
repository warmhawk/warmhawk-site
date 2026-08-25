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
 */
export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-[240px] flex-none md:sticky md:top-8 md:max-h-[calc(100vh-4rem)] md:overflow-y-auto pb-6 md:pb-10">
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
    </aside>
  );
}

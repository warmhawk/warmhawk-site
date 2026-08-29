import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import DocsIndexPage from './page';
import { docsSections, opsAppendix } from '@/lib/docsNav';

// DocCard wraps BOTH the title div and the body-text div inside the same
// <a>, so a card link's computed accessible name is "title body-text"
// concatenated, not just the title — an exact-string match on the title
// alone finds nothing. Anchoring a regex at the start of the name matches
// the actual DOM structure without depending on the (much longer, less
// stable) body copy.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function startsWithTitle(title: string): RegExp {
  return new RegExp(`^${escapeRegExp(title)}`);
}

// No JSX here, same as components/DomainCheckTool.test.ts: this repo's
// Vitest setup renders TSX component files fine as import targets, but
// hasn't got a JSX transform wired up for *.test.ts files themselves, so
// createElement() sidesteps that rather than renaming every test file to
// .test.tsx.
describe('DocsIndexPage (app/docs/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 and every doc section/card without throwing', () => {
    render(createElement(DocsIndexPage));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Everything you need to run WarmHawk.',
    );

    // Every section label (Get started, Guides, Self-hosting, API
    // reference, Reference) plus the appendix section, and every doc link
    // inside them, should actually be on the page — this is
    // `lib/docsNav.ts`'s single source of truth rendering end to end.
    for (const section of docsSections) {
      expect(screen.getByText(section.label)).toBeInTheDocument();
      for (const link of section.links) {
        expect(screen.getByRole('link', { name: startsWithTitle(link.title) })).toHaveAttribute(
          'href',
          link.href,
        );
      }
    }

    expect(screen.getByText('Operations appendix')).toBeInTheDocument();
    for (const link of opsAppendix) {
      expect(screen.getByRole('link', { name: startsWithTitle(link.title) })).toHaveAttribute(
        'href',
        link.href,
      );
    }
  });

  it('links to the machine-readable OpenAPI spec, for coding agents and API clients', () => {
    render(createElement(DocsIndexPage));

    expect(
      screen.getByRole('link', { name: startsWithTitle('OpenAPI spec (openapi.json)') }),
    ).toHaveAttribute('href', '/openapi.json');
  });
});

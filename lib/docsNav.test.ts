import { describe, expect, it } from 'vitest';
import { docsFlatOrder, getPrevNext, getBreadcrumbTrail } from './docsNav';

/**
 * `getPrevNext` drives the footer prev/next nav rendered on every doc
 * article page (app/docs/layout.tsx) — it's the one piece of real branching
 * logic behind that layout (first page has no prev, last page has no next,
 * an unrecognized pathname gets neither), so it's worth testing directly as
 * pure logic rather than only indirectly via a full component render.
 */
describe('getPrevNext', () => {
  it('returns null prev and the second link as next for the first page in reading order', () => {
    const first = docsFlatOrder[0]!;
    const second = docsFlatOrder[1]!;

    const result = getPrevNext(first.href);

    expect(result.prev).toBeNull();
    expect(result.next).toEqual(second);
  });

  it('returns the neighboring links on both sides for a page in the middle', () => {
    const middleIndex = Math.floor(docsFlatOrder.length / 2);
    const middle = docsFlatOrder[middleIndex]!;
    const before = docsFlatOrder[middleIndex - 1]!;
    const after = docsFlatOrder[middleIndex + 1]!;

    const result = getPrevNext(middle.href);

    expect(result.prev).toEqual(before);
    expect(result.next).toEqual(after);
  });

  it('returns the second-to-last link as prev and null next for the last page in reading order', () => {
    const last = docsFlatOrder[docsFlatOrder.length - 1]!;
    const secondToLast = docsFlatOrder[docsFlatOrder.length - 2]!;

    const result = getPrevNext(last.href);

    expect(result.prev).toEqual(secondToLast);
    expect(result.next).toBeNull();
  });

  it('returns neither prev nor next for a pathname not in the reading order (e.g. the /docs index)', () => {
    const result = getPrevNext('/docs');

    expect(result.prev).toBeNull();
    expect(result.next).toBeNull();
  });

  it('has at least two entries, so the first/middle/last cases above are all distinct', () => {
    expect(docsFlatOrder.length).toBeGreaterThanOrEqual(3);
  });
});

/**
 * `getBreadcrumbTrail` feeds the BreadcrumbList JSON-LD rendered in
 * app/docs/layout.tsx (lib/seo.ts's `breadcrumbSchema`) — covers the same
 * "known page vs. unknown pathname" branching `getPrevNext` above does.
 */
describe('getBreadcrumbTrail', () => {
  it('returns a Home > Docs > page trail for a real doc page, ending on that page', () => {
    const page = docsFlatOrder[0]!;

    const trail = getBreadcrumbTrail(page.href);

    expect(trail).toEqual([
      { name: 'Home', path: '/' },
      { name: 'Docs', path: '/docs' },
      { name: page.title, path: page.href },
    ]);
  });

  it('returns an empty trail for a pathname outside the docs reading order', () => {
    expect(getBreadcrumbTrail('/docs')).toEqual([]);
    expect(getBreadcrumbTrail('/not-a-real-page')).toEqual([]);
  });

  it('every intermediate crumb resolves to a real path (Home and Docs are always present together)', () => {
    const trail = getBreadcrumbTrail(docsFlatOrder[docsFlatOrder.length - 1]!.href);
    expect(trail.map((c) => c.path)).toEqual(['/', '/docs', docsFlatOrder[docsFlatOrder.length - 1]!.href]);
  });
});

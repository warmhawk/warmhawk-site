import { describe, expect, it } from 'vitest';
import { docsFlatOrder, getPrevNext } from './docsNav';

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

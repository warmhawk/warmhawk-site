import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import BlogIndexPage from './page';
import { blogPosts } from '@/lib/blogPosts';

describe('BlogIndexPage (app/blog/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 and a card linking to every post in lib/blogPosts', () => {
    render(createElement(BlogIndexPage));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Deliverability, explained plainly.',
    );

    for (const post of blogPosts) {
      // Escape regex metacharacters in the title (e.g. the parens in "... (2026)") so this
      // matches the literal title text instead of being parsed as a regex pattern.
      const escapedTitle = post.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(screen.getByRole('link', { name: new RegExp(escapedTitle) })).toHaveAttribute(
        'href',
        `/blog/${post.slug}`,
      );
    }
  });
});

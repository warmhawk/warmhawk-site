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
      expect(screen.getByRole('link', { name: new RegExp(post.title) })).toHaveAttribute(
        'href',
        `/blog/${post.slug}`,
      );
    }
  });
});

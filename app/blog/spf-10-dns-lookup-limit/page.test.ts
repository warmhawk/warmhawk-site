import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import SpfLookupLimitPost from './page';

describe('SpfLookupLimitPost (app/blog/spf-10-dns-lookup-limit/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 and links to the SPF checker tool', () => {
    render(createElement(SpfLookupLimitPost));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("SPF's 10-lookup limit");
    expect(screen.getByRole('link', { name: 'Check your SPF record →' })).toHaveAttribute(
      'href',
      '/tools/spf-checker',
    );
  });

  it('links back to the blog index', () => {
    render(createElement(SpfLookupLimitPost));

    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog');
  });
});

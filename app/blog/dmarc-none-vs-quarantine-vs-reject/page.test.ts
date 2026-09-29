import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import DmarcPolicyPost from './page';

describe('DmarcPolicyPost (app/blog/dmarc-none-vs-quarantine-vs-reject/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 and links to the DMARC checker tool', () => {
    render(createElement(DmarcPolicyPost));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'DMARC p=none vs quarantine vs reject: which policy should you actually run?',
    );
    expect(screen.getByRole('link', { name: 'Check your DMARC record →' })).toHaveAttribute(
      'href',
      '/tools/dmarc-checker',
    );
  });

  it('links back to the blog index', () => {
    render(createElement(DmarcPolicyPost));

    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog');
  });
});

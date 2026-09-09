import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import AuthenticationExplainedPost from './page';

describe('AuthenticationExplainedPost (app/blog/spf-dkim-dmarc-explained/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 and links to all 4 relevant checker tools', () => {
    render(createElement(AuthenticationExplainedPost));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'SPF, DKIM, and DMARC: what each one actually checks',
    );
    expect(screen.getByRole('link', { name: 'SPF checker →' })).toHaveAttribute(
      'href',
      '/tools/spf-checker',
    );
    expect(screen.getByRole('link', { name: 'DKIM checker →' })).toHaveAttribute(
      'href',
      '/tools/dkim-checker',
    );
    expect(screen.getByRole('link', { name: 'DMARC checker →' })).toHaveAttribute(
      'href',
      '/tools/dmarc-checker',
    );
    expect(screen.getByRole('link', { name: 'Full domain health check →' })).toHaveAttribute(
      'href',
      '/tools/domain-check',
    );
  });

  it('cross-links to the SPF 10-lookup-limit post', () => {
    render(createElement(AuthenticationExplainedPost));

    expect(screen.getByRole('link', { name: 'exactly 10 DNS lookups' })).toHaveAttribute(
      'href',
      '/blog/spf-10-dns-lookup-limit',
    );
  });
});

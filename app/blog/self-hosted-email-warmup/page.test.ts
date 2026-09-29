import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import SelfHostedEmailWarmupPost from './page';

describe('SelfHostedEmailWarmupPost (app/blog/self-hosted-email-warmup/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 and links to the free engine quickstart', () => {
    render(createElement(SelfHostedEmailWarmupPost));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Self-hosted email warmup: how it actually works',
    );
    expect(screen.getByRole('link', { name: 'Get the free engine →' })).toHaveAttribute(
      'href',
      '/docs/quickstart',
    );
  });

  it('links to the domain health check tool and back to the blog index', () => {
    render(createElement(SelfHostedEmailWarmupPost));

    expect(screen.getByRole('link', { name: 'Check a domain’s current health →' })).toHaveAttribute(
      'href',
      '/tools/domain-check',
    );
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog');
  });
});

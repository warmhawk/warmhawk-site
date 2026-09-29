import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import GoogleWorkspaceVsMicrosoft365Post from './page';

describe('GoogleWorkspaceVsMicrosoft365Post (app/blog/google-workspace-vs-microsoft-365-cold-email/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 and links to the domain health check tool', () => {
    render(createElement(GoogleWorkspaceVsMicrosoft365Post));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Google Workspace vs Microsoft 365 for cold email (2026)',
    );
    expect(screen.getByRole('link', { name: 'Full domain health check →' })).toHaveAttribute(
      'href',
      '/tools/domain-check',
    );
  });

  it('links to the 5.7.708 error page and back to the blog index', () => {
    render(createElement(GoogleWorkspaceVsMicrosoft365Post));

    expect(screen.getByRole('link', { name: 'Fix a 5.7.708 block →' })).toHaveAttribute(
      'href',
      '/errors/5-7-708',
    );
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/blog');
  });
});

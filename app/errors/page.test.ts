import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ErrorsHubPage from './page';
import SmtpErrorPage, { generateMetadata, generateStaticParams } from './[slug]/page';
import { smtpErrors } from '@/lib/smtpErrors';

describe('ErrorsHubPage (app/errors/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('links every dictionary entry from the hub', () => {
    render(createElement(ErrorsHubPage));
    for (const entry of smtpErrors) {
      expect(
        document.querySelector(`a[href="/errors/${entry.slug}"]`),
        `${entry.slug} missing from hub`,
      ).not.toBeNull();
    }
  });

  it('decodes a pasted bounce into a fix link', () => {
    render(createElement(ErrorsHubPage));

    fireEvent.change(screen.getByLabelText(/Paste the bounce message/), {
      target: {
        value:
          "Remote server returned '550 5.7.708 Service unavailable. Access denied, traffic not accepted from this IP.'",
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Decode bounce' }));
    expect(screen.getByRole('link', { name: /How to fix 5\.7\.708/ })).toHaveAttribute(
      'href',
      '/errors/5-7-708',
    );
  });
});

describe('SmtpErrorPage (app/errors/[slug]/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('generates one static page per entry', () => {
    expect(generateStaticParams()).toHaveLength(smtpErrors.length);
  });

  it('titles a page with its full reply and headline', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: '5-7-26' }) });
    expect((metadata.title as { absolute: string }).absolute).toContain('550 5.7.26');
    expect(String(metadata.description).length).toBeLessThanOrEqual(160);
  });

  it('renders every entry without throwing', async () => {
    for (const entry of smtpErrors) {
      render(await SmtpErrorPage({ params: Promise.resolve({ slug: entry.slug }) }));
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(entry.headline);
      cleanup();
    }
  });
});

import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ColdEmailCalculatorPage from './page';

describe('ColdEmailCalculatorPage (app/tools/cold-email-calculator/page.tsx)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the h1 and the default sizing for 20,000 emails', () => {
    render(createElement(ColdEmailCalculatorPage));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'How many domains and mailboxes do you need',
    );
    const status = screen.getByRole('status');
    expect(within(status).getByText('31')).toBeInTheDocument();
    expect(within(status).getByText('11')).toBeInTheDocument();
  });

  it('recomputes live when the volume changes', () => {
    render(createElement(ColdEmailCalculatorPage));

    fireEvent.change(screen.getByLabelText('Cold emails per month'), {
      target: { value: '3000' },
    });
    const status = screen.getByRole('status');
    expect(within(status).getByText('5')).toBeInTheDocument();
    expect(within(status).getByText('Growth')).toBeInTheDocument();
  });

  it('shows a note instead of a price when volume is past every public plan', () => {
    render(createElement(ColdEmailCalculatorPage));

    fireEvent.click(screen.getByRole('button', { name: '300,000' }));
    expect(screen.getByText(/Multichannel, \$109 per user/)).toBeInTheDocument();
  });

  it('shows the warmup ramp reaching full volume on day 25', () => {
    render(createElement(ColdEmailCalculatorPage));

    expect(screen.getByRole('heading', { name: 'Warmup ramp' })).toBeInTheDocument();
    expect(screen.getByText('day 25')).toBeInTheDocument();
    expect(screen.getByText('Warmup only, no campaigns')).toBeInTheDocument();
    // Week 3 across 31 mailboxes: 5 × 31 = 155 up to 15 × 31 = 465.
    expect(screen.getByText('155–465')).toBeInTheDocument();
  });

  it('never calls WarmHawk open source', () => {
    const { container } = render(createElement(ColdEmailCalculatorPage));
    expect(container.textContent).not.toMatch(/open[- ]source/i);
    expect(container.textContent).toMatch(/source-available/);
  });
});

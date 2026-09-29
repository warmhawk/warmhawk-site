import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ANALYTICS_ENABLED and the tool attribution state are module-level, so each
// test re-imports a fresh copy with a GA4 id stubbed in and reads what track()
// hands to window.gtag.
async function loadAnalytics() {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_GA4_MEASUREMENT_ID', 'G-TEST');
  return import('./analytics');
}

describe('analytics attribution', () => {
  const gtag = vi.fn();

  beforeEach(() => {
    gtag.mockReset();
    window.gtag = gtag;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.gtag;
    window.history.replaceState(null, '', '/');
  });

  it('tags pricing_view and checkout_start with the free tool used earlier in the session', async () => {
    const { track, EVENTS } = await loadAnalytics();

    window.history.replaceState(null, '', '/tools/spf-checker');
    track(EVENTS.domainCheckRun, { verdict: 'pass' });
    window.history.replaceState(null, '', '/compare/pricing');
    track(EVENTS.pricingView, { path: '/compare/pricing' });
    track(EVENTS.checkoutStart, { billing_interval: 'month' });

    expect(gtag).toHaveBeenCalledWith('event', 'domain_check_run', { verdict: 'pass' });
    expect(gtag).toHaveBeenCalledWith('event', 'pricing_view', {
      path: '/compare/pricing',
      via_tool: 'tool-spf-checker',
    });
    expect(gtag).toHaveBeenCalledWith('event', 'checkout_start', {
      billing_interval: 'month',
      via_tool: 'tool-spf-checker',
    });
  });

  it('leaves via_tool off when no tool was used', async () => {
    const { track, EVENTS } = await loadAnalytics();

    track(EVENTS.checkoutStart, { tier: 'tier_2' });

    expect(gtag).toHaveBeenCalledWith('event', 'checkout_start', { tier: 'tier_2' });
  });

  it('names every /errors page as one tool', async () => {
    const { toolRef } = await loadAnalytics();

    expect(toolRef('/errors')).toBe('tool-errors');
    expect(toolRef('/errors/5-7-708')).toBe('tool-errors');
    expect(toolRef('/tools/cold-email-calculator')).toBe('tool-cold-email-calculator');
  });

  it('carries ?ref= alongside utm_* in the landing attribution', async () => {
    const { landingAttribution } = await loadAnalytics();

    window.history.replaceState(null, '', '/?ref=github&utm_source=hn');

    expect(landingAttribution()).toMatchObject({
      ref: 'github',
      utm_source: 'hn',
      landing_path: '/',
    });
  });
});

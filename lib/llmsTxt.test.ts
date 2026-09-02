import { describe, it, expect } from 'vitest';
import { buildLlmsTxt, buildLlmsFullTxt } from './llmsTxt';
import { siteConfig, vsPages } from './siteConfig';
import { docsSections } from './docsNav';
import { tiers } from './tierConfig';
import { homeFaqItems } from './faqContent';

/**
 * Covers the GEO-baseline content served at https://warmhawk.com/llms.txt.
 * Unlike Jitterflow's hand-maintained static copy, this content is
 * generated from `docsSections`/`vsPages`/`tiers`, so these tests assert
 * it actually reflects those sources (and would fail if a future
 * doc/tier/vs-page were added there but this builder silently fell out of
 * sync) rather than snapshotting exact prose.
 */
describe('buildLlmsTxt', () => {
  it('opens with an H1 site name and a blockquote summary', () => {
    const body = buildLlmsTxt();
    const lines = body.split('\n');
    expect(lines[0]).toBe(`# ${siteConfig.name}`);
    expect(lines[2]).toBe(`> ${siteConfig.description}`);
  });

  it('lists every doc page from docsSections, with its real URL and body summary', () => {
    const body = buildLlmsTxt();
    for (const section of docsSections) {
      for (const link of section.links) {
        expect(body).toContain(`[${link.title}](${siteConfig.url}${link.href})`);
        expect(body).toContain(link.body);
      }
    }
  });

  it('lists every enabled /vs/* comparison page and never /vs/instantly unless its flag is on', () => {
    const body = buildLlmsTxt();
    for (const vs of vsPages) {
      expect(body).toContain(`(${siteConfig.url}/vs/${vs.slug})`);
    }
    if (!vsPages.some((vs) => vs.slug === 'instantly')) {
      expect(body).not.toContain('/vs/instantly');
    }
  });

  it('lists every pricing tier with its price', () => {
    const body = buildLlmsTxt();
    for (const tier of tiers) {
      expect(body).toContain(tier.tierLabel);
      expect(body).toContain(tier.priceAmount);
    }
  });

  it('links to the domain-check tool, security, status, and legal pages', () => {
    const body = buildLlmsTxt();
    expect(body).toContain(`${siteConfig.url}/tools/domain-check`);
    expect(body).toContain(`${siteConfig.url}/security`);
    expect(body).toContain(`${siteConfig.url}/status`);
    expect(body).toContain(`${siteConfig.url}/legal/terms`);
    expect(body).toContain(`${siteConfig.url}/legal/privacy`);
  });

  it('links to the machine-readable OpenAPI spec', () => {
    const body = buildLlmsTxt();
    expect(body).toContain(`${siteConfig.url}/openapi.json`);
  });

  it('ends with a trailing newline', () => {
    expect(buildLlmsTxt().endsWith('\n')).toBe(true);
  });
});

/**
 * Covers https://warmhawk.com/llms-full.txt — the llms.txt convention's
 * "full" companion file. Asserts it's a strict superset of llms.txt (same
 * index, plus real FAQ answer text), not that it reflects unrelated prose.
 */
describe('buildLlmsFullTxt', () => {
  it('contains the same index content as buildLlmsTxt', () => {
    const full = buildLlmsFullTxt();
    expect(full).toContain(`# ${siteConfig.name}`);
    expect(full).toContain(`${siteConfig.url}/tools/domain-check`);
  });

  it('inlines the real question and answer text for the home page FAQ', () => {
    const full = buildLlmsFullTxt();
    for (const { question, answer } of homeFaqItems) {
      expect(full).toContain(question);
      expect(full).toContain(answer);
    }
  });

  it('ends with a trailing newline', () => {
    expect(buildLlmsFullTxt().endsWith('\n')).toBe(true);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildInstallCommand,
  buildLicenseEmailHtml,
  buildLicenseEmailText,
  environmentNote,
  escapeHtml,
  tierLabelFor,
} from './email';

describe('environmentNote', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null on the real production domain — zero added friction for real customers', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://warmhawk.com');
    expect(environmentNote()).toBeNull();
  });

  it('returns the site URL on any other deployment', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://stage.warmhawk.com');
    expect(environmentNote()).toBe('https://stage.warmhawk.com');
  });

  it('returns null when unset, matching a real production deploy with the var simply not configured', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    expect(environmentNote()).toBeNull();
  });
});

describe('escapeHtml', () => {
  it('escapes all five reserved HTML characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });
});

describe('tierLabelFor', () => {
  it('labels tier_1 as Self-Hosted Pro and tier_2 as Enterprise DFY', () => {
    expect(tierLabelFor('tier_1')).toBe('Self-Hosted Pro');
    expect(tierLabelFor('tier_2')).toBe('Enterprise DFY');
  });
});

describe('buildInstallCommand', () => {
  it('embeds the license token, a <your-domain> placeholder, and the real owner email', () => {
    const command = buildInstallCommand('a.b.sig', 'owner@example.com');
    expect(command).toContain('--license a.b.sig');
    expect(command).toContain('--domain <your-domain>');
    expect(command).toContain('--owner-email owner@example.com');
  });
});

describe('buildLicenseEmailText', () => {
  const command = 'curl -fsSL https://warmhawk.com/install | bash -s -- --license tok --domain <your-domain> --owner-email owner@example.com';

  it('omits the environment note on production (envNote = null)', () => {
    const text = buildLicenseEmailText('Self-Hosted Pro', null, command);
    expect(text).not.toContain('sent from');
    expect(text).toContain('Thanks for subscribing to WarmHawk (Self-Hosted Pro).');
    expect(text).toContain(command);
  });

  it('includes a "(sent from <url>)" line when a non-production envNote is passed', () => {
    const text = buildLicenseEmailText('Self-Hosted Pro', 'https://stage.warmhawk.com', command);
    expect(text).toContain('(sent from https://stage.warmhawk.com)');
  });

  it('tells the customer their email is editable, not locked', () => {
    const text = buildLicenseEmailText('Self-Hosted Pro', null, command);
    expect(text).toContain('edit it');
  });

  it('signs off as User Support / WarmHawk.com, not a bare "WarmHawk" line', () => {
    const text = buildLicenseEmailText('Self-Hosted Pro', null, command);
    expect(text).toContain('User Support,\nWarmHawk.com');
  });

  it('never includes a physical mailing address', () => {
    const text = buildLicenseEmailText('Self-Hosted Pro', null, command);
    expect(text).not.toMatch(/\d+ .+,\s*\w+,\s*[A-Z]{2}\s*\d{5}/);
  });
});

describe('buildLicenseEmailHtml', () => {
  const command = 'curl -fsSL https://warmhawk.com/install | bash -s -- --license tok --domain <your-domain> --owner-email owner@example.com';

  it('declares a UTF-8 charset (regression: an em dash rendered as mojibake without this)', () => {
    const html = buildLicenseEmailHtml('Self-Hosted Pro', null, command);
    expect(html).toContain('<meta charset="utf-8">');
  });

  it('constrains the card to max-width:100% so it shrinks on narrow mobile screens', () => {
    const html = buildLicenseEmailHtml('Self-Hosted Pro', null, command);
    expect(html).toContain('max-width:100%');
  });

  it('uses overflow-wrap:anywhere on the command block, not word-break:break-all (regression: break-all split ordinary short words mid-character)', () => {
    const html = buildLicenseEmailHtml('Self-Hosted Pro', null, command);
    expect(html).toContain('overflow-wrap:anywhere');
    expect(html).not.toContain('break-all');
  });

  it('escapes the install command rather than injecting it raw', () => {
    const html = buildLicenseEmailHtml('Self-Hosted Pro', null, '--license <script>alert(1)</script>');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders WarmHawk.com as a clickable link', () => {
    const html = buildLicenseEmailHtml('Self-Hosted Pro', null, command);
    expect(html).toContain('<a href="https://warmhawk.com"');
  });

  it('omits the environment note paragraph on production, includes it otherwise', () => {
    const prod = buildLicenseEmailHtml('Self-Hosted Pro', null, command);
    expect(prod).not.toContain('sent from');

    const stage = buildLicenseEmailHtml('Self-Hosted Pro', 'https://stage.warmhawk.com', command);
    expect(stage).toContain('sent from https://stage.warmhawk.com');
  });

  it('does not claim a functioning copy button — email clients strip all JavaScript', () => {
    const html = buildLicenseEmailHtml('Self-Hosted Pro', null, command);
    expect(html).not.toMatch(/onclick|<script/i);
    expect(html).toContain('select all and copy it');
  });
});

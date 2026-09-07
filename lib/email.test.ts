import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildInstallCommand,
  buildLicenseEmailHtml,
  buildLicenseEmailText,
  EmailSendError,
  emailSender,
  environmentNote,
  escapeHtml,
  parseAddress,
  sendViaZeptomail,
  tierLabelFor,
} from './email';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const message = {
  from: 'WarmHawk <support@warmhawk.com>',
  to: 'someone@example.com',
  subject: 'Hello',
  html: '<p>Hi</p>',
};

describe('parseAddress', () => {
  it('splits a display name from the address', () => {
    expect(parseAddress('WarmHawk <support@warmhawk.com>')).toEqual({
      address: 'support@warmhawk.com',
      name: 'WarmHawk',
    });
  });

  it('accepts a bare address and yields no name', () => {
    expect(parseAddress('support@warmhawk.com')).toEqual({ address: 'support@warmhawk.com' });
  });
});

describe('sendViaZeptomail', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('skips without throwing when ZEPTOMAIL_TOKEN is unset', async () => {
    vi.stubEnv('ZEPTOMAIL_TOKEN', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(sendViaZeptomail(message)).resolves.toEqual({ skipped: true });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('posts the ZeptoMail body shape and returns the request id', async () => {
    vi.stubEnv('ZEPTOMAIL_TOKEN', 'test-token');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(201, { request_id: 'req-123' }));

    await expect(sendViaZeptomail(message)).resolves.toEqual({ skipped: false, id: 'req-123' });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.zeptomail.com/v1.1/email');
    expect(JSON.parse(init.body as string)).toEqual({
      from: { address: 'support@warmhawk.com', name: 'WarmHawk' },
      to: [{ email_address: { address: 'someone@example.com' } }],
      subject: 'Hello',
      htmlbody: '<p>Hi</p>',
    });
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Zoho-enczapikey test-token',
    );
  });

  it('unpacks the nested detail from an ambiguous 401', async () => {
    vi.stubEnv('ZEPTOMAIL_TOKEN', 'test-token');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(401, {
        error: {
          code: 'TM_4001',
          message: 'Access Denied',
          details: [
            {
              message: 'Invalid recipient',
              inner_error: { message: 'to[0].email_address.address is not a valid address' },
            },
          ],
        },
      }),
    );

    await expect(sendViaZeptomail(message)).rejects.toMatchObject({
      name: 'EmailSendError',
      status: 401,
      code: 'TM_4001',
      message:
        'Access Denied: Invalid recipient; to[0].email_address.address is not a valid address',
    });
  });

  it('throws EmailSendError with no status on a transport failure', async () => {
    vi.stubEnv('ZEPTOMAIL_TOKEN', 'test-token');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const err = await sendViaZeptomail(message).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(EmailSendError);
    expect((err as EmailSendError).status).toBeUndefined();
    expect((err as EmailSendError).message).toContain('ECONNREFUSED');
  });
});

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

describe('sendInviteRelayEmail (ZeptomailEmailSender)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('degrades to a console-log stub and reports email_not_configured when ZEPTOMAIL_TOKEN is unset', async () => {
    vi.stubEnv('ZEPTOMAIL_TOKEN', '');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await emailSender.sendInviteRelayEmail({
      toEmail: 'invitee@example.com',
      inviterEmail: 'owner@example.com',
      acceptUrl: 'https://dashboard.example.com/accept-invite?token=abc',
    });

    expect(result).toEqual({ delivered: false, reason: 'email_not_configured' });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('invite-relay-email STUB'));
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
  const command =
    'curl -fsSL https://warmhawk.com/install | bash -s -- --license tok --domain <your-domain> --owner-email owner@example.com';

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
  const command =
    'curl -fsSL https://warmhawk.com/install | bash -s -- --license tok --domain <your-domain> --owner-email owner@example.com';

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
    const html = buildLicenseEmailHtml(
      'Self-Hosted Pro',
      null,
      '--license <script>alert(1)</script>',
    );
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

import nodemailer, { type Transporter } from 'nodemailer';
import { siteConfig } from './siteConfig';

/**
 * Transactional email — license delivery, and Tier 2 sales inquiries.
 *
 * V12 fix: the Stripe webhook handler previously only `console.log`'d the issued license key with
 * a `TODO(pre-launch)` marker. This is a real, pluggable sender against a generic SMTP config
 * (the standard pattern any founder-operated transactional sender would use, same shape as
 * warmhawk-enterprise-operator's `lib/email/invite-email.ts`) — but this build makes no live SMTP
 * connection: `getTransporter()` is lazy, and nothing calls it unless `SMTP_HOST` is actually set
 * (see `sendLicenseEmail`'s early-return-to-console-log fallback below), matching the "no real
 * external network/API calls" build constraint. Once real `SMTP_*` env vars are set in production,
 * this works with zero code changes.
 *
 * `sendSalesInquiryEmail` (Part B, /checkout's Tier 2 contact form) reuses this exact same
 * lazy-transporter / degrade-to-console mechanism rather than inventing a second email pathway —
 * it notifies `siteConfig.helloEmail`, the same address the marketing site already uses for
 * "Talk to us" (see lib/tierConfig.ts's old mailto CTA and lib/siteConfig.ts), not a new env var.
 */

export interface LicenseEmailInput {
  toEmail: string;
  licenseToken: string;
  tier: 'tier_1' | 'tier_2';
}

export interface SalesInquiryEmailInput {
  company: string;
  name: string;
  /** The prospect's own email — used as replyTo so a reply goes straight to them. */
  email: string;
  volume: string;
  notes: string;
}

export interface InviteRelayEmailInput {
  toEmail: string;
  inviterEmail: string;
  acceptUrl: string;
}

/** Mirrors warmhawk-enterprise-operator's own `InviteEmailResult` shape exactly — the operator's
 *  `/api/team/members` passes this straight back to its caller, so the two must stay in sync. See
 *  `app/api/operator/relay-invite/route.ts`'s module doc for why this send happens here at all. */
export type InviteRelayEmailResult =
  | { delivered: true }
  | { delivered: false; reason: 'smtp_not_configured' | 'send_failed'; detail?: string };

export interface EmailSender {
  sendLicenseEmail(input: LicenseEmailInput): Promise<void>;
  sendSalesInquiryEmail(input: SalesInquiryEmailInput): Promise<void>;
  sendInviteRelayEmail(input: InviteRelayEmailInput): Promise<InviteRelayEmailResult>;
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

/** The deploy's own site URL, shown in the email only when it isn't the real production domain —
 *  so a test/stage purchase's email is never mistaken for a real customer's. Production shows
 *  nothing extra at all: zero added friction for real customers. `NEXT_PUBLIC_SITE_URL` is already
 *  set per-deployment (production is the only one that should ever equal the real domain), so this
 *  needs no new env var. */
export function environmentNote(): string | null {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl || siteUrl === 'https://warmhawk.com') return null;
  return siteUrl;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    // Implicit TLS only on the SMTPS port (465) — 587/25 use STARTTLS, negotiated automatically
    // by nodemailer when `secure: false`.
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return cachedTransporter;
}

/** The install command a customer runs to bring their instance up — per the spec's Minimal-Effort
 *  Launch section, "Stripe checkout confirmation email contains a single copy-pasteable command,
 *  license key already embedded as a flag." The domain isn't known yet at issuance time (it's only
 *  chosen when the customer actually runs the installer), so this hands them a template with a
 *  placeholder to fill in rather than a real `--domain` value.
 *
 *  Bug fix (install-flow build pass): `/api/install` (the route this command actually curls)
 *  requires `--owner-email` — both product installers need it up front to provision the dashboard
 *  owner's invite (see warmhawk-enterprise-operator/scripts/install.sh's required flags), and
 *  `LicensePayload` (lib/license.ts) carries no email field to fall back on, so there is no way to
 *  derive it later. Previously this command omitted `--owner-email` entirely, which would have
 *  made every emailed install command fail validation the moment `/api/install` existed. Unlike
 *  `--domain`, the owner's email IS already known at issuance time (it's the same address this
 *  email is being sent to), so it's embedded as a real value here, not a placeholder. */
export function buildInstallCommand(licenseToken: string, ownerEmail: string): string {
  return `curl -fsSL https://warmhawk.com/install | bash -s -- --license ${licenseToken} --domain <your-domain> --owner-email ${ownerEmail}`;
}

export function tierLabelFor(tier: LicenseEmailInput['tier']): string {
  return tier === 'tier_2' ? 'Enterprise DFY' : 'Self-Hosted Pro';
}

/** Plain-text body — the fallback every client can render, and the only version sent if HTML
 *  rendering is ever dropped. Kept in sync with buildLicenseEmailHtml by hand; both take the same
 *  three inputs so there's nothing else that could drift between them. */
export function buildLicenseEmailText(
  tierLabel: string,
  envNote: string | null,
  installCommand: string,
): string {
  return [
    `Thanks for subscribing to WarmHawk (${tierLabel}).`,
    ...(envNote ? [`(sent from ${envNote})`] : []),
    '',
    '------------------------------------------------------------',
    '',
    '1. Replace <your-domain> below with the domain your dashboard should be',
    '   reachable at.',
    '2. Your email is pre-filled with the address you signed up with —',
    "   edit it if you'd like a different account to own the dashboard.",
    '3. Then run this on the server you want to install WarmHawk on:',
    '',
    installCommand,
    '',
    '------------------------------------------------------------',
    '',
    'Questions? Reply to this email or reach us at support@warmhawk.com.',
    '',
    'User Support,',
    'WarmHawk.com',
    // TODO(pre-launch): a valid physical postal address is required here for CAN-SPAM
    // compliance on commercial email (a PO Box or CMRA address is sufficient — no home
    // address). Add it once a business mailing address exists.
  ].join('\n');
}

/** HTML body — same content as buildLicenseEmailText, styled so the install command sits in its
 *  own monospace block (one line, wraps rather than truncates) for an easy triple-click/select-all
 *  copy. No copy-to-clipboard button: email clients strip all JavaScript, so a real one-click copy
 *  isn't achievable inside the email itself — this is the ceiling for an email-only approach.
 *  Colors match the site's own palette (globals.css's `:root` in warmhawk-enterprise-operator, the
 *  same source-of-truth artifact this site's own Tailwind config is built from). */
export function buildLicenseEmailHtml(
  tierLabel: string,
  envNote: string | null,
  installCommand: string,
): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:24px 0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#251d14;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:0 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;table-layout:fixed;background:#fbf8f1;border-radius:8px;">
            <tr>
              <td style="padding:32px;box-sizing:border-box;">
                <p style="margin:0 0 4px;font-size:16px;">Thanks for subscribing to WarmHawk (${escapeHtml(tierLabel)}).</p>
                ${envNote ? `<p style="margin:0 0 20px;font-size:13px;color:#6b6354;">(sent from ${escapeHtml(envNote)})</p>` : '<div style="height:16px;"></div>'}
                <p style="margin:0 0 8px;font-size:14px;">
                  1. Replace <code style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">&lt;your-domain&gt;</code> below with the domain your dashboard should be reachable at.<br>
                  2. Your email is pre-filled with the address you signed up with — edit it if you'd like a different account to own the dashboard.<br>
                  3. Then run this on the server you want to install WarmHawk on:
                </p>
                <p style="margin:12px 0 4px;font-size:12px;color:#6b6354;">The command below — select all and copy it:</p>
                <pre style="width:100%;box-sizing:border-box;background:#f3eee1;border:1px solid #d9cdaf;border-radius:6px;padding:14px 16px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:normal;overflow-wrap:anywhere;margin:0 0 24px;">${escapeHtml(installCommand)}</pre>
                <p style="margin:0 0 24px;font-size:14px;">Questions? Reply to this email or reach us at <a href="mailto:support@warmhawk.com" style="color:#b94b27;">support@warmhawk.com</a>.</p>
                <p style="margin:0;font-size:14px;">User Support,<br><a href="https://warmhawk.com" style="color:#251d14;">WarmHawk.com</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

class SmtpEmailSender implements EmailSender {
  async sendLicenseEmail(input: LicenseEmailInput): Promise<void> {
    const installCommand = buildInstallCommand(input.licenseToken, input.toEmail);

    if (!smtpConfigured()) {
      // Pre-launch fallback, matching invite-email.ts's convention in warmhawk-enterprise-operator
      // and the "no live external calls in this build" constraint — never throws, so a missing
      // SMTP config degrades to a log line instead of failing the whole webhook handler.
      console.log(
        `[license-email STUB — SMTP_HOST not set] Would send license to ${input.toEmail}:`,
        { tier: input.tier, installCommand },
      );
      return;
    }

    const envNote = environmentNote();
    const tierLabel = tierLabelFor(input.tier);

    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || siteConfig.defaultFrom,
      to: input.toEmail,
      subject: 'Your WarmHawk install command',
      text: buildLicenseEmailText(tierLabel, envNote, installCommand),
      html: buildLicenseEmailHtml(tierLabel, envNote, installCommand),
    });
  }

  /** Tier 2 (Enterprise DFY)'s optional async setup-intake questionnaire (app/api/contact-sales) —
   *  separate from the actual Tier 2 purchase, which goes through Stripe Checkout like Tier 1 (see
   *  app/api/checkout/session). This just notifies the sales inbox so the founder has setup
   *  context ahead of a purchase, same lazy-transporter / degrade-to-console-log mechanism as
   *  sendLicenseEmail above. */
  async sendSalesInquiryEmail(input: SalesInquiryEmailInput): Promise<void> {
    const subject = `Tier 2 (Enterprise DFY) inquiry — ${input.company}`;
    const text = [
      'New Enterprise DFY inquiry submitted via /checkout.',
      '',
      `Company: ${input.company}`,
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Approx. domains/mailboxes: ${input.volume}`,
      '',
      'Notes:',
      input.notes || '(none provided)',
    ].join('\n');

    if (!smtpConfigured()) {
      console.log(
        `[sales-inquiry-email STUB — SMTP_HOST not set] Would notify ${siteConfig.helloEmail}:`,
        { company: input.company, name: input.name, email: input.email, volume: input.volume },
      );
      return;
    }

    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || siteConfig.defaultFrom,
      to: siteConfig.helloEmail,
      replyTo: input.email,
      subject,
      text,
    });
  }

  /** Sends a self-hosted operator's team-invite email on its behalf — see
   *  `app/api/operator/relay-invite/route.ts`'s module doc for why this exists. Content mirrors
   *  warmhawk-enterprise-operator's own (now-removed) `renderInviteEmail()` text exactly, so the
   *  customer-visible email is identical to what a self-configured SMTP sender would have produced.
   *  Unlike the other two senders above, this one reports delivery status back to the caller instead
   *  of only logging on failure — the operator's own UI needs to know whether to offer the accept
   *  link as a copyable fallback. */
  async sendInviteRelayEmail(input: InviteRelayEmailInput): Promise<InviteRelayEmailResult> {
    const subject = `${input.inviterEmail} invited you to WarmHawk`;
    const text = [
      `${input.inviterEmail} invited you to join their WarmHawk team.`,
      '',
      `Accept your invite: ${input.acceptUrl}`,
      '',
      "This link expires in 7 days. If you weren't expecting this invite, you can ignore this email.",
    ].join('\n');
    const html = `
      <p>${escapeHtml(input.inviterEmail)} invited you to join their WarmHawk team.</p>
      <p><a href="${escapeHtml(input.acceptUrl)}">Accept your invite</a></p>
      <p style="color:#666;font-size:0.9em">This link expires in 7 days. If you weren't expecting this invite, you can ignore this email.</p>
    `.trim();

    if (!smtpConfigured()) {
      console.log(
        `[invite-relay-email STUB — SMTP_HOST not set] Would send invite to ${input.toEmail} (invited by ${input.inviterEmail}): ${input.acceptUrl}`,
      );
      return { delivered: false, reason: 'smtp_not_configured' };
    }

    try {
      await getTransporter().sendMail({
        from: process.env.SMTP_FROM || siteConfig.defaultFrom,
        to: input.toEmail,
        subject,
        text,
        html,
      });
      return { delivered: true };
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown SMTP error';
      console.error(`[invite-relay-email] send failed for ${input.toEmail}: ${detail}`);
      return { delivered: false, reason: 'send_failed', detail };
    }
  }
}

// Swap this for a different EmailSender implementation if the transactional provider ever changes
// — every call site depends only on the `EmailSender` interface, never on nodemailer directly.
export const emailSender: EmailSender = new SmtpEmailSender();

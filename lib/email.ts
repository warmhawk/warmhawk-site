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

export interface EmailSender {
  sendLicenseEmail(input: LicenseEmailInput): Promise<void>;
  sendSalesInquiryEmail(input: SalesInquiryEmailInput): Promise<void>;
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
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
function buildInstallCommand(licenseToken: string, ownerEmail: string): string {
  return `curl -fsSL https://warmhawk.com/install | bash -s -- --license ${licenseToken} --domain <your-domain> --owner-email ${ownerEmail}`;
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

    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || siteConfig.billingFrom,
      to: input.toEmail,
      subject: 'Your WarmHawk install command',
      text: [
        `Thanks for subscribing to WarmHawk (${input.tier === 'tier_2' ? 'Enterprise DFY' : 'Self-Hosted Pro'}).`,
        '',
        'Run this command on the server you want to install WarmHawk on — replace <your-domain>',
        'with the domain you want your dashboard reachable at:',
        '',
        installCommand,
        '',
        'Questions? Reply to this email or reach us at support@warmhawk.com.',
      ].join('\n'),
    });
  }

  /** Tier 2 (Enterprise DFY) is a custom-scoped one-time + retainer engagement sold via a contact
   *  form, never a self-serve Stripe Checkout Session — this notifies the sales inbox so the
   *  founder can follow up, same lazy-transporter / degrade-to-console-log mechanism as
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
      from: process.env.SMTP_FROM || siteConfig.billingFrom,
      to: siteConfig.helloEmail,
      replyTo: input.email,
      subject,
      text,
    });
  }
}

// Swap this for a different EmailSender implementation if the transactional provider ever changes
// — every call site depends only on the `EmailSender` interface, never on nodemailer directly.
export const emailSender: EmailSender = new SmtpEmailSender();

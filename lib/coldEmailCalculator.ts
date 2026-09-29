import { vendors, warmhawkPlans, type VendorId, type VendorPlan } from './competitorPricing';

/**
 * Cold-email sizing math for app/tools/cold-email-calculator. Pure functions only, so the page,
 * the client component and the tests all share one implementation.
 *
 * Model: every option needs the same mailboxes and domains (you bring your own Google Workspace or
 * Microsoft 365 inboxes whichever tool sends), so infrastructure is computed once. What differs is
 * the software line: a SaaS plan sized to the volume, or WarmHawk's flat fee plus a small server.
 */

export interface CalculatorInput {
  /** Cold emails sent per month, all steps of every sequence included. */
  emailsPerMonth: number;
  /** Safe daily sends per mailbox. 30 is the common ceiling for a warmed cold inbox. */
  perInboxPerDay: number;
  /** Mailboxes per sending domain. 2–3 keeps one bad domain from sinking the rest. */
  inboxesPerDomain: number;
  sendingDaysPerMonth: number;
  /** Emails per contact (sequence steps). Turns monthly emails into active contacts. */
  stepsPerContact: number;
  mailboxMonthly: number;
  domainYearly: number;
  serverMonthly: number;
}

export const DEFAULT_INPUT: CalculatorInput = {
  emailsPerMonth: 20_000,
  perInboxPerDay: 30,
  inboxesPerDomain: 3,
  sendingDaysPerMonth: 22,
  stepsPerContact: 3,
  mailboxMonthly: 7,
  domainYearly: 12,
  serverMonthly: 10,
};

export interface Infrastructure {
  inboxes: number;
  domains: number;
  contactsPerMonth: number;
  mailboxCost: number;
  domainCost: number;
  /** Mailboxes + domains, per month. Shared by every option below. */
  monthly: number;
}

export interface OptionCost {
  id: VendorId | 'warmhawk-tier0' | 'warmhawk-tier1';
  vendor: string;
  /** Plan label, e.g. "Hypergrowth". Null when no public flat-priced plan fits. */
  plan: string | null;
  software: number | null;
  /** Software + infrastructure (+ server for WarmHawk), per month. Null when nothing public fits. */
  monthly: number | null;
  yearly: number | null;
  note?: string;
}

export interface CalculatorResult {
  infrastructure: Infrastructure;
  options: OptionCost[];
}

function positive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Cleans user input: sizes must be positive (else the default), prices may be zero. */
export function normalizeInput(input: CalculatorInput): CalculatorInput {
  return {
    emailsPerMonth: Math.round(nonNegative(input.emailsPerMonth)),
    perInboxPerDay: positive(input.perInboxPerDay, DEFAULT_INPUT.perInboxPerDay),
    inboxesPerDomain: Math.round(positive(input.inboxesPerDomain, DEFAULT_INPUT.inboxesPerDomain)),
    sendingDaysPerMonth: Math.min(
      31,
      positive(input.sendingDaysPerMonth, DEFAULT_INPUT.sendingDaysPerMonth),
    ),
    stepsPerContact: positive(input.stepsPerContact, DEFAULT_INPUT.stepsPerContact),
    mailboxMonthly: nonNegative(input.mailboxMonthly),
    domainYearly: nonNegative(input.domainYearly),
    serverMonthly: nonNegative(input.serverMonthly),
  };
}

export function sizeInfrastructure(raw: CalculatorInput): Infrastructure {
  const input = normalizeInput(raw);
  const inboxes =
    input.emailsPerMonth === 0
      ? 0
      : Math.ceil(input.emailsPerMonth / (input.perInboxPerDay * input.sendingDaysPerMonth));
  const domains = inboxes === 0 ? 0 : Math.ceil(inboxes / input.inboxesPerDomain);
  const mailboxCost = inboxes * input.mailboxMonthly;
  const domainCost = (domains * input.domainYearly) / 12;
  return {
    inboxes,
    domains,
    contactsPerMonth: Math.ceil(input.emailsPerMonth / input.stepsPerContact),
    mailboxCost,
    domainCost,
    monthly: mailboxCost + domainCost,
  };
}

function fits(plan: VendorPlan, emails: number, contacts: number): boolean {
  return (
    (plan.maxEmails === null || emails <= plan.maxEmails) &&
    (plan.maxContacts === null || contacts <= plan.maxContacts)
  );
}

/**
 * The cheapest public plan that covers the volume. Per-user plans (Lemlist Multichannel) are left
 * out on purpose: their price depends on how a team maps people to senders, which a volume
 * calculator can't know, so past the flat plans the vendor shows its `beyondTopPlan` note instead.
 */
export function cheapestPlan(
  vendorId: VendorId,
  emails: number,
  contacts: number,
): { plan: string; software: number } | null {
  const vendor = vendors.find((item) => item.id === vendorId);
  if (!vendor) return null;
  let best: { plan: string; software: number } | null = null;
  for (const plan of vendor.plans) {
    if (!fits(plan, emails, contacts)) continue;
    if (!best || plan.monthly < best.software) best = { plan: plan.name, software: plan.monthly };
  }
  return best;
}

export function calculate(raw: CalculatorInput): CalculatorResult {
  const input = normalizeInput(raw);
  const infrastructure = sizeInfrastructure(input);
  const { contactsPerMonth } = infrastructure;

  const saas: OptionCost[] = vendors.map((vendor) => {
    const pick = cheapestPlan(vendor.id, input.emailsPerMonth, contactsPerMonth);
    if (!pick) {
      return {
        id: vendor.id,
        vendor: vendor.name,
        plan: null,
        software: null,
        monthly: null,
        yearly: null,
        note: `Above every public plan: ${vendor.beyondTopPlan}.`,
      };
    }
    const monthly = pick.software + infrastructure.monthly;
    return {
      id: vendor.id,
      vendor: vendor.name,
      plan: pick.plan,
      software: pick.software,
      monthly,
      yearly: monthly * 12,
    };
  });

  const warmhawk: OptionCost[] = [
    {
      id: 'warmhawk-tier1',
      vendor: 'WarmHawk',
      plan: warmhawkPlans.tier1.name,
      software: warmhawkPlans.tier1.monthly + input.serverMonthly,
      monthly: warmhawkPlans.tier1.monthly + input.serverMonthly + infrastructure.monthly,
      yearly: (warmhawkPlans.tier1.monthly + input.serverMonthly + infrastructure.monthly) * 12,
      note: 'Flat fee plus your own server. No send, contact or mailbox caps.',
    },
    {
      id: 'warmhawk-tier0',
      vendor: 'WarmHawk',
      plan: warmhawkPlans.tier0.name,
      software: input.serverMonthly,
      monthly: input.serverMonthly + infrastructure.monthly,
      yearly: (input.serverMonthly + infrastructure.monthly) * 12,
      note: 'Free, source-available engine on your server. API only, no dashboard.',
    },
  ];

  return { infrastructure, options: [...saas, ...warmhawk] };
}

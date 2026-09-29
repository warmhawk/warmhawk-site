/**
 * Public list prices for the cold-email calculator (app/tools/cold-email-calculator). Each figure
 * was read off the vendor's own pricing page on PRICING_VERIFIED_ON — monthly billing, USD. When a
 * vendor changes a plan, update the row and the date together; the page prints both.
 *
 * `maxEmails` / `maxContacts` are the plan's monthly sending and active-contact caps. `null` means
 * the plan publishes no cap for that dimension. A plan is picked only when it fits both.
 */

export const PRICING_VERIFIED_ON = '2026-09-29';

export type VendorId = 'instantly' | 'smartlead' | 'lemlist';

export interface VendorPlan {
  name: string;
  monthly: number;
  maxEmails: number | null;
  maxContacts: number | null;
}

export interface Vendor {
  id: VendorId;
  name: string;
  pricingUrl: string;
  plans: VendorPlan[];
  /** What happens past the biggest public plan. */
  beyondTopPlan: string;
}

export const vendors: Vendor[] = [
  {
    id: 'instantly',
    name: 'Instantly',
    pricingUrl: 'https://instantly.ai/pricing',
    plans: [
      { name: 'Growth', monthly: 47, maxEmails: 5_000, maxContacts: 1_000 },
      { name: 'Hypergrowth', monthly: 97, maxEmails: 125_000, maxContacts: 25_000 },
      { name: 'Lightspeed', monthly: 358, maxEmails: 500_000, maxContacts: 100_000 },
    ],
    beyondTopPlan: 'Enterprise, custom pricing',
  },
  {
    id: 'smartlead',
    name: 'Smartlead',
    pricingUrl: 'https://www.smartlead.ai/pricing',
    plans: [
      { name: 'Base', monthly: 39, maxEmails: 6_000, maxContacts: 2_000 },
      { name: 'Pro', monthly: 94, maxEmails: 90_000, maxContacts: 30_000 },
      { name: 'Unlimited Smart', monthly: 174, maxEmails: 150_000, maxContacts: null },
      { name: 'Unlimited Prime', monthly: 379, maxEmails: 500_000, maxContacts: null },
    ],
    beyondTopPlan: 'custom pricing',
  },
  {
    id: 'lemlist',
    name: 'Lemlist',
    pricingUrl: 'https://www.lemlist.com/pricing',
    plans: [{ name: 'Email', monthly: 69, maxEmails: 50_000, maxContacts: null }],
    beyondTopPlan: 'Multichannel, $109 per user per month for 5 senders each',
  },
];

/** WarmHawk's own prices — mirrors lib/tierConfig.ts (Tier 0 and Tier 1). */
export const warmhawkPlans = {
  tier0: { name: 'Tier 0 (API only)', monthly: 0 },
  tier1: { name: 'Tier 1 (dashboard)', monthly: 199 },
} as const;

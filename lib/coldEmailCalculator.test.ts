import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INPUT,
  calculate,
  cheapestPlan,
  normalizeInput,
  sizeInfrastructure,
} from './coldEmailCalculator';

const at = (emailsPerMonth: number) => ({ ...DEFAULT_INPUT, emailsPerMonth });
const option = (emails: number, id: string) =>
  calculate(at(emails)).options.find((item) => item.id === id);

describe('sizeInfrastructure()', () => {
  it('sizes mailboxes from daily capacity and domains from mailboxes per domain', () => {
    // 20,000 / (30 × 22 = 660) = 30.3 → 31 inboxes → 11 domains at 3 per domain.
    const infra = sizeInfrastructure(DEFAULT_INPUT);
    expect(infra.inboxes).toBe(31);
    expect(infra.domains).toBe(11);
    expect(infra.contactsPerMonth).toBe(6_667);
    expect(infra.mailboxCost).toBe(31 * 7);
    expect(infra.domainCost).toBe(11);
    expect(infra.monthly).toBe(31 * 7 + 11);
  });

  it('needs nothing for zero emails', () => {
    const infra = sizeInfrastructure(at(0));
    expect(infra).toMatchObject({ inboxes: 0, domains: 0, monthly: 0 });
  });

  it('rounds partial mailboxes up, never down', () => {
    expect(sizeInfrastructure(at(661)).inboxes).toBe(2);
    expect(sizeInfrastructure(at(660)).inboxes).toBe(1);
  });
});

describe('normalizeInput()', () => {
  it('replaces zero or garbage sizes with defaults so nothing divides by zero', () => {
    const clean = normalizeInput({
      ...DEFAULT_INPUT,
      perInboxPerDay: 0,
      inboxesPerDomain: Number.NaN,
      sendingDaysPerMonth: 40,
      emailsPerMonth: -5,
    });
    expect(clean.perInboxPerDay).toBe(30);
    expect(clean.inboxesPerDomain).toBe(3);
    expect(clean.sendingDaysPerMonth).toBe(31);
    expect(clean.emailsPerMonth).toBe(0);
  });
});

describe('cheapestPlan()', () => {
  it('needs both the email and the contact cap to fit', () => {
    // 5,000 emails fits Instantly Growth's send cap, but 1,667 contacts is over its 1,000.
    expect(cheapestPlan('instantly', 5_000, 1_667)?.plan).toBe('Hypergrowth');
    expect(cheapestPlan('instantly', 3_000, 1_000)).toEqual({ plan: 'Growth', software: 47 });
  });

  it('returns null past the largest flat-priced public plan', () => {
    expect(cheapestPlan('instantly', 600_000, 200_000)).toBeNull();
    expect(cheapestPlan('smartlead', 600_000, 200_000)).toBeNull();
    expect(cheapestPlan('lemlist', 40_000, 13_334)?.plan).toBe('Email');
    expect(cheapestPlan('lemlist', 60_000, 20_000)).toBeNull();
  });
});

describe('calculate()', () => {
  it('is honest that SaaS is cheaper than WarmHawk Tier 1 at low volume', () => {
    const smartlead = option(3_000, 'smartlead');
    const tier1 = option(3_000, 'warmhawk-tier1');
    expect(smartlead?.monthly).toBeLessThan(tier1?.monthly ?? 0);
  });

  it('charges every option the same infrastructure', () => {
    const { infrastructure, options } = calculate(at(100_000));
    for (const item of options) {
      if (item.monthly === null || item.software === null) continue;
      expect(item.monthly - item.software).toBeCloseTo(infrastructure.monthly);
      expect(item.yearly).toBeCloseTo(item.monthly * 12);
    }
  });

  it('keeps WarmHawk flat as volume grows while SaaS steps up', () => {
    expect(option(20_000, 'warmhawk-tier1')?.software).toBe(
      option(400_000, 'warmhawk-tier1')?.software,
    );
    expect(option(400_000, 'smartlead')?.plan).toBe('Unlimited Prime');
  });

  it('marks vendors with no public plan instead of inventing a price', () => {
    const instantly = option(750_000, 'instantly');
    expect(instantly?.monthly).toBeNull();
    expect(instantly?.note).toContain('Enterprise');
  });
});

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_INPUT,
  calculate,
  type CalculatorInput,
  type OptionCost,
} from '@/lib/coldEmailCalculator';
import { PRICING_VERIFIED_ON, vendors } from '@/lib/competitorPricing';
import { EVENTS, track } from '@/lib/analytics';

type FieldKey = keyof CalculatorInput;

const VOLUME_PRESETS = [5_000, 20_000, 100_000, 300_000];

const ASSUMPTIONS: ReadonlyArray<{ key: FieldKey; label: string; hint: string; step?: number }> = [
  {
    key: 'perInboxPerDay',
    label: 'Emails per mailbox per day',
    hint: '30 is a safe warmed ceiling',
  },
  { key: 'inboxesPerDomain', label: 'Mailboxes per domain', hint: '2–3 limits the blast radius' },
  { key: 'sendingDaysPerMonth', label: 'Sending days per month', hint: 'Weekdays only is 22' },
  { key: 'stepsPerContact', label: 'Emails per contact', hint: 'Sequence steps, for contact caps' },
  { key: 'mailboxMonthly', label: 'Mailbox $/month', hint: 'Workspace or M365 starter seat' },
  { key: 'domainYearly', label: 'Domain $/year', hint: 'A .com at list price' },
  { key: 'serverMonthly', label: 'Server $/month', hint: 'WarmHawk only: a small VPS' },
];

const money = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value < 100 && value % 1 !== 0 ? 2 : 0,
  });

/**
 * Cold-email sizing + cost calculator. Everything recomputes live from lib/coldEmailCalculator.ts;
 * analytics records only the monthly volume, debounced so typing a number sends one event.
 */
export function ColdEmailCalculator() {
  const [input, setInput] = useState<CalculatorInput>(DEFAULT_INPUT);
  const result = useMemo(() => calculate(input), [input]);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = window.setTimeout(
      () => track(EVENTS.coldEmailCalcRun, { emails_per_month: input.emailsPerMonth }),
      1500,
    );
    return () => window.clearTimeout(timer);
  }, [input.emailsPerMonth]);

  function update(key: FieldKey, raw: string) {
    setInput((current) => ({ ...current, [key]: raw === '' ? 0 : Number(raw) }));
  }

  const { infrastructure, options } = result;
  const priced = options.filter((item) => item.monthly !== null);
  const cheapest = priced.reduce<OptionCost | null>(
    (best, item) => (best === null || (item.monthly ?? 0) < (best.monthly ?? 0) ? item : best),
    null,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <form className="kicker-card lg:self-start" onSubmit={(event) => event.preventDefault()}>
        <div className="field">
          <label htmlFor="calc-emails">Cold emails per month</label>
          <input
            id="calc-emails"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={input.emailsPerMonth || ''}
            onChange={(event) => update('emailsPerMonth', event.target.value)}
            className="font-mono"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {VOLUME_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setInput((current) => ({ ...current, emailsPerMonth: preset }))}
                className={`rounded-full border-[1.5px] px-3 py-1 text-xs font-medium ${
                  input.emailsPerMonth === preset
                    ? 'border-rust text-rust'
                    : 'border-border-dark text-ink hover:bg-ink/5'
                }`}
              >
                {preset.toLocaleString('en-US')}
              </button>
            ))}
          </div>
        </div>

        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-semibold text-rust">
            Assumptions (edit any)
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-x-4">
            {ASSUMPTIONS.map((field) => (
              <div key={field.key} className="field">
                <label htmlFor={`calc-${field.key}`}>{field.label}</label>
                <input
                  id={`calc-${field.key}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={input[field.key] || ''}
                  onChange={(event) => update(field.key, event.target.value)}
                  className="font-mono"
                />
                <p className="mt-1 text-[12px] text-ink-muted">{field.hint}</p>
              </div>
            ))}
          </div>
        </details>
      </form>

      <div role="status" aria-live="polite" className="min-w-0">
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Mailboxes', value: infrastructure.inboxes.toLocaleString('en-US') },
            { label: 'Domains', value: infrastructure.domains.toLocaleString('en-US') },
            { label: 'Infra / month', value: money(infrastructure.monthly) },
          ].map((stat) => (
            <div key={stat.label} className="card bg-cream-elevated p-4">
              <p className="label text-ink-muted mb-1">{stat.label}</p>
              <p className="font-display text-2xl md:text-3xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
        <p className="text-[13.5px] text-ink-muted mb-5">
          {infrastructure.contactsPerMonth.toLocaleString('en-US')} new contacts a month. Mailboxes
          and domains cost the same whichever tool sends, so they are included in every total below.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-border-dark">
                <th className="py-2 pr-3 font-semibold">Tool &amp; plan</th>
                <th className="hidden sm:table-cell py-2 pr-3 font-semibold text-right">
                  Software
                </th>
                <th className="py-2 pr-3 font-semibold text-right">Total / mo</th>
                <th className="hidden sm:table-cell py-2 font-semibold text-right">12 months</th>
              </tr>
            </thead>
            <tbody>
              {options.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-border align-top ${
                    item.id.startsWith('warmhawk') ? 'bg-rust-tint/40' : ''
                  }`}
                >
                  <td className="py-3 pr-3">
                    <span className="font-semibold text-ink">{item.vendor}</span>{' '}
                    <span className="text-ink-muted">{item.plan ?? ''}</span>
                    {cheapest?.id === item.id && (
                      <span className="ml-2 rounded-full bg-rust px-2 py-0.5 text-[11px] font-semibold text-rust-fg">
                        lowest
                      </span>
                    )}
                    {item.note && <p className="mt-1 text-[12.5px] text-ink-muted">{item.note}</p>}
                  </td>
                  <td className="hidden sm:table-cell py-3 pr-3 text-right font-mono">
                    {item.software === null ? '—' : money(item.software)}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono font-semibold">
                    {item.monthly === null ? '—' : money(item.monthly)}
                  </td>
                  <td className="hidden sm:table-cell py-3 text-right font-mono">
                    {item.yearly === null ? '—' : money(item.yearly)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-[12.5px] text-ink-muted">
          List prices, monthly billing, checked {PRICING_VERIFIED_ON}:{' '}
          {vendors.map((vendor, i) => (
            <span key={vendor.id}>
              {i > 0 ? ' · ' : ''}
              <a href={vendor.pricingUrl} className="underline" rel="noopener" target="_blank">
                {vendor.name}
              </a>
            </span>
          ))}
          {' · '}
          <Link href="/compare/pricing" className="underline">
            WarmHawk
          </Link>
          . Annual billing lowers every SaaS price by 17–20%.
        </p>
      </div>
    </div>
  );
}

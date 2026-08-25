import { Fragment } from 'react';

/**
 * The artifact's `.compare-wrap` / `.compare-cols` / `.compare-row` pattern,
 * shared by the homepage's "Shared SaaS vs WarmHawk" table and every /vs/*
 * page's own compare table — one component so all 6 tables stay visually
 * identical instead of drifting (the homepage had this right; the 5 vs/*
 * pages were still on an older, structurally different "Capability" table
 * with vertical dividers and no per-cell WarmHawk highlight).
 */
export interface CompareRow {
  label: string;
  them: React.ReactNode;
  us: React.ReactNode;
}

export function CompareTable({ themLabel, rows }: { themLabel: string; rows: CompareRow[] }) {
  return (
    <div className="bg-paper border border-border rounded-[20px] overflow-hidden overflow-x-auto">
      <div className="grid grid-cols-[1.3fr_1fr_1fr] min-w-[600px]">
        <div className="bg-cream-elevated border-b border-border" />
        <div className="bg-cream-elevated border-b border-border p-5 font-display font-semibold text-base">
          {themLabel}
        </div>
        <div className="bg-cream-elevated border-b border-border p-5 font-display font-semibold text-base text-rust">
          WarmHawk
        </div>
        {rows.map((row) => (
          <Fragment key={row.label}>
            <div className="p-4 px-5 border-t border-border text-sm font-semibold text-ink">{row.label}</div>
            <div className="p-4 px-5 border-t border-border text-sm text-ink-muted">{row.them}</div>
            <div className="p-4 px-5 border-t border-border text-sm font-medium bg-rust-tint">{row.us}</div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

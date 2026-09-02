import type { ReactNode } from 'react';

/** Inline cited-statistic wrapper — AEO baseline calls for "a cited
 * statistic every 150-200 words," sourced from the spec's own Competitor
 * Pain Points table. Always pass the same source string the table names
 * (e.g. "G2/Reddit", "2026 deliverability research"). */
export function StatCite({ children, source }: { children: ReactNode; source: string }) {
  return (
    <span>
      {children} <span className="text-[13px] text-ink-muted">({source})</span>
    </span>
  );
}

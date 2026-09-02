/**
 * The artifact's `.compare-wrap` / `.compare-cols` / `.compare-row` pattern,
 * shared by the homepage's "Shared SaaS vs WarmHawk" table and every /vs/*
 * page's own compare table — one component so all 6 tables stay visually
 * identical instead of drifting (the homepage had this right; the 5 vs/*
 * pages were still on an older, structurally different "Capability" table
 * with vertical dividers and no per-cell WarmHawk highlight).
 *
 * Real <table> markup (not a div grid) on purpose — these are the site's
 * highest-value AEO/GEO content (the exact rows an answer engine lifts into
 * a "WarmHawk vs X" comparison snippet), so they need real header/row/cell
 * semantics for a parser to key off, the same reasoning already applied to
 * the feature matrix on /compare/pricing.
 */
export interface CompareRow {
  label: string;
  them: React.ReactNode;
  us: React.ReactNode;
}

export function CompareTable({ themLabel, rows }: { themLabel: string; rows: CompareRow[] }) {
  return (
    <div className="bg-paper border border-border rounded-[20px] overflow-hidden overflow-x-auto">
      <table className="w-full border-collapse min-w-[600px]">
        <colgroup>
          <col className="w-[38%]" />
          <col className="w-[31%]" />
          <col className="w-[31%]" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="bg-cream-elevated border-b border-border p-5" />
            <th
              scope="col"
              className="bg-cream-elevated border-b border-border p-5 text-left font-display font-semibold text-base"
            >
              {themLabel}
            </th>
            <th
              scope="col"
              className="bg-cream-elevated border-b border-border p-5 text-left font-display font-semibold text-base text-rust"
            >
              WarmHawk
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th
                scope="row"
                className="p-4 px-5 border-t border-border text-left text-sm font-semibold text-ink"
              >
                {row.label}
              </th>
              <td className="p-4 px-5 border-t border-border text-sm text-ink-muted">{row.them}</td>
              <td className="p-4 px-5 border-t border-border text-sm font-medium bg-rust-tint">
                {row.us}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

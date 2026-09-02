export type CheckStatus = 'pass' | 'fail' | 'pending' | 'unconfigured';

const LABELS: Record<CheckStatus, string> = {
  pass: 'PASS',
  fail: 'FAIL',
  pending: 'PENDING',
  unconfigured: 'NOT CONFIGURED',
};

/** PASS/FAIL/PENDING badge — shared visual pattern between the licensed
 * dashboard's domain-health screen and the public /tools/domain-check
 * tool, per the spec's "instant PASS/FAIL badges matching the same visual
 * pattern already used in the dashboard." Matches the artifact's own
 * `<span class="badge badge-green"><span class="badge-dot"></span>PASS</span>`
 * exactly — a colored dot, not a checkmark/cross/ellipsis character.
 * "unconfigured" is a fourth, deliberately-neutral state (distinct from a
 * fabricated "pass") used by /status when no real status provider is wired
 * up yet. */
export function CheckBadge({ status }: { status: CheckStatus }) {
  return (
    <span className={`badge badge-${status}`}>
      <span className="badge-dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}

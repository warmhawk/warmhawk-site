/**
 * The status badge, shared by the licensed dashboard's domain-health screen and the public
 * /tools/domain-check tool — per the spec's "instant badges matching the same visual pattern
 * already used in the dashboard". A colored dot, never a checkmark/cross/ellipsis character.
 *
 * 🔑 **Four states, because the checks have four answers.** The probe returns
 * `pass | warn | fail | unknown`, and each one has to be visually distinct:
 *
 * | State | Means | Why it cannot be merged into another |
 * |---|---|---|
 * | `pass` | the check succeeded | — |
 * | `warn` | a real finding, but not a failure | `p=none` is a published policy that asks receivers to do nothing. Calling it FAIL tells someone their working setup is broken |
 * | `fail` | a genuine defect | — |
 * | `unknown` | we could not determine it | 🔴 the important one |
 *
 * `unknown` exists because the alternative is lying. A DNSBL that answers `127.255.255.254` is
 * refusing our query, not reporting a listing: rendering that as FAIL accuses every domain checked
 * of being blocklisted, and rendering it as PASS hides that the check silently stopped working.
 * DKIM selectors cannot be enumerated from DNS at all, so "we tried nine common names and found
 * none" is a statement about our guesses, not about the domain.
 *
 * The colors reuse the two existing token pairs rather than introducing new ones: the source
 * artifact's four badge colors (green / amber / red / gray) map exactly onto these four states.
 * `pending` and `unconfigured` are retained for the /status page, which has its own vocabulary.
 */
export type CheckStatus =
  | 'pass'
  | 'warn'
  | 'fail'
  | 'unknown'
  | 'pending'
  | 'unconfigured';

const LABELS: Record<CheckStatus, string> = {
  pass: 'PASS',
  warn: 'WARN',
  fail: 'FAIL',
  unknown: 'UNKNOWN',
  pending: 'PENDING',
  unconfigured: 'NOT CONFIGURED',
};

export function CheckBadge({ status }: { status: CheckStatus }) {
  return (
    <span className={`badge badge-${status}`}>
      <span className="badge-dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}

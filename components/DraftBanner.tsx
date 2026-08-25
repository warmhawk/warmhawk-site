/**
 * Required on every /legal/* page per the build instructions: "Mark every
 * one of these pages clearly, in a visible banner component, as 'DRAFT —
 * pending attorney review, not yet legally binding.'" This is a structural
 * implementation of the spec's stated requirements, not legal advice.
 */
export function DraftBanner() {
  return (
    <div className="bg-pending/15 border-b border-pending/40">
      <div className="wrap py-4 flex items-start gap-3">
        <span className="text-lg leading-none" aria-hidden="true">
          ⚠️
        </span>
        <p className="text-[14px] leading-relaxed text-ink">
          <strong>DRAFT — pending attorney review, not yet legally binding.</strong> This page
          implements the structural requirements described in WarmHawk&rsquo;s internal product
          specification. It has not been reviewed by a licensed attorney, is not legal advice, and
          must not be relied on as a finished policy until counsel signs off and this banner is
          removed.
        </p>
      </div>
    </div>
  );
}

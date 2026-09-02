import type { ReactNode } from 'react';

/**
 * The AEO "40-60 word direct-answer block at the top of each major
 * section" pattern, applied consistently site-wide. Keep the child text
 * genuinely in that range — it's what an answer engine is expected to
 * quote back verbatim.
 */
export function AnswerBlock({ children }: { children: ReactNode }) {
  return (
    <p className="text-[17px] leading-relaxed text-ink border-l-2 border-rust pl-5 my-6 max-w-3xl">
      {children}
    </p>
  );
}

// Matches the artifact's `.doc-tab pre`: slate bg/text, 10px radius, unconditional
// margin-top:12px (mt-3) — needed for consecutive Request/Response blocks with nothing between them.
//
// Closed by default behind a native <details> disclosure: a Tier 1/2 reader scrolling a Guide
// page should never have to look at raw curl to find out the API isn't required for them (see
// notes/1-plan/09-07-26-dashboard-nav-and-tier-buyer-docs.md). One change here fixes every
// CodeBlock sitewide at once — no per-page edits needed.
export function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <details className="group bg-slate text-slate-soft rounded-[10px] overflow-x-auto mt-3">
      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-[17px] py-4 text-[11px] uppercase tracking-wide text-slate-soft/60 [&::-webkit-details-marker]:hidden">
        <span>API details (Tier 0 / self-hosters){label ? ` · ${label}` : ''}</span>
        <span className="transition-transform group-open:rotate-90">&#9656;</span>
      </summary>
      <pre className="px-[17px] pb-[15px] text-[12.5px] leading-relaxed font-mono whitespace-pre-wrap break-words">
        <code>{children}</code>
      </pre>
    </details>
  );
}

// Matches the artifact's `.doc-tab pre`: slate bg/text, 10px radius, unconditional
// margin-top:12px (mt-3) — needed for consecutive Request/Response blocks with nothing between them.
export function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="bg-slate text-slate-soft rounded-[10px] overflow-x-auto mt-3">
      {label && (
        <div className="text-[11px] uppercase tracking-wide text-slate-soft/60 px-[17px] pt-4">
          {label}
        </div>
      )}
      <pre className="px-[17px] py-[15px] text-[12.5px] leading-relaxed font-mono whitespace-pre-wrap break-words">
        <code>{children}</code>
      </pre>
    </div>
  );
}

/**
 * Renders a literal HTML comment into the page source (not a JSX comment,
 * which React strips entirely) — used on /vs/instantly per the build
 * instructions: "add a visible `<!-- DO NOT PUBLISH: gated on seed-inbox
 * placement feature shipping, see spec Guardrails section -->` comment."
 * This page must stay noindex'd and unlinked from nav/sitemap until the
 * seed-inbox placement test (Guardrails) ships — see Go-Live Checklist,
 * "Content accuracy."
 */
export function DoNotPublishComment() {
  return (
    <div
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html:
          '<!-- DO NOT PUBLISH: gated on seed-inbox placement feature shipping, see spec Guardrails section -->',
      }}
    />
  );
}

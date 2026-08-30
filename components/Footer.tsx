import Link from 'next/link';
import { footerLinks } from '@/lib/siteConfig';
import { BrandMark } from '@/components/BrandMark';

/**
 * Matches the design artifact's actual footer — a light `--cream-2` band
 * (confirmed against the artifact's own CSS: `footer{background:var(--cream-2)...}`),
 * the exact brand mark, and SITE_FOOTER's bottom bar. The bottom-bar link is the one
 * deliberate divergence from the artifact's copy; see its own comment below.
 */
export function Footer() {
  return (
    <div className="bg-footer-bg border-t border-footer-border">
      <div className="wrap py-16 pb-10 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5 mb-3.5">
            <BrandMark size={22} />
            <span className="font-display font-bold text-base text-footer-ink">WarmHawk</span>
          </div>
          <div className="text-[13.5px] leading-relaxed text-footer-ink/70 max-w-[230px] mb-4.5">
            Warm is the mechanic — mailbox warmup, deliverability-first sending. Hawk is precision
            targeting over volume.
          </div>
          <div className="flex gap-2 flex-wrap mb-4.5">
            {['BSL 4-YEAR', 'SELF-HOSTED', 'SINGLE-TENANT'].map((tag) => (
              <span
                key={tag}
                className="label text-[10px] px-2.5 py-1 border border-footer-ink/20 rounded-full text-footer-ink/60"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <FooterColumn title="Product" links={footerLinks.product} />
        <FooterColumn title="Compare" links={footerLinks.compare} />
        <FooterColumn title="Resources" links={footerLinks.company} />
        <FooterColumn title="Legal" links={footerLinks.legal} />
      </div>
      <div className="border-t border-footer-ink/10">
        <div className="wrap py-5 flex justify-between flex-wrap gap-2.5 text-[13px] text-footer-ink/55">
          <span>© 2026 WarmHawk. Self-hosted, always.</span>
          {/* Was an external link to github.com/warmhawk/warmhawk-enterprise-operator labelled
              "(demo)". Two problems, both found in the 2026-08-30 go-live link crawl: that repo is
              proprietary and stays private permanently, so the link was GitHub's 404 page on all 41
              pages of the site; and there is no demo to view, so the label promised something that
              doesn't exist. Points at the tier comparison instead — the page that actually answers
              "what do I get in the dashboard". */}
          <Link href="/compare/pricing" className="text-rust font-semibold">
            See what the operator dashboard includes →
          </Link>
        </div>
      </div>
    </div>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="label text-footer-ink mb-3.5">{title}</div>
      <div className="flex flex-col gap-2.5 text-[13.5px] text-footer-ink/80">
        {links.map((link) => (
          <a key={link.label} href={link.href} className="hover:text-rust transition-colors">
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

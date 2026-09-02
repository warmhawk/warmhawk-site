import { faqSchema } from '@/lib/seo';

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Renders both the visible FAQ block and the matching FAQPage JSON-LD schema.
 * Matches the artifact's `.faq-list`/`.faq-item`/`.faq-q`/`.faq-a` exactly: a
 * single-column accordion (Fraunces question + mono "+" that rotates open),
 * not the previous static two-column grid with everything expanded and no
 * artifact-sourced background band. `<details>/<summary>` gives real
 * expand/collapse behavior natively, no client JS needed. The first item
 * defaults open, matching the artifact's `.faq-item.open` on its first row.
 */
export function FaqSection({
  items,
  title = 'Questions worth answering up front',
  eyebrow = 'Questions',
}: {
  items: FaqItem[];
  title?: string;
  eyebrow?: string;
}) {
  const schema = faqSchema(items);
  return (
    <div className="border-t border-b border-border">
      <div className="wrap py-16 md:py-[88px]">
        <div className="max-w-xl mb-11">
          <p className="label text-rust mb-3">{eyebrow}</p>
          <h2 className="font-display text-[28px] md:text-[34px] font-semibold leading-tight">
            {title}
          </h2>
        </div>
        <div className="border-t border-border">
          {items.map((item, i) => (
            <details key={item.question} className="group border-b border-border" open={i === 0}>
              <summary className="w-full text-left flex justify-between items-center gap-5 py-5 px-0.5 font-display text-[17px] font-semibold text-ink cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden">
                {item.question}
                <span className="font-mono text-xl text-rust transition-transform duration-200 flex-none group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-5 px-0.5 text-[15px] leading-relaxed text-ink-muted max-w-[70ch]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </div>
  );
}

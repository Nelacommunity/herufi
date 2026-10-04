import { ChevronDown } from "lucide-react";

/** Accessible, zero-JS FAQ accordion. Pair with FAQPage JSON-LD built from the same items. */
export function FaqList({ items, defaultOpen = 0 }: { items: { q: string; a: string }[]; defaultOpen?: number }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item, i) => (
        <details key={item.q} className="group" open={i < defaultOpen}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left [&::-webkit-details-marker]:hidden">
            <h3 className="text-[17px] font-medium">{item.q}</h3>
            <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <p className="pb-6 pr-8 text-pretty leading-relaxed text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export function faqJsonLd(items: { q: string; a: string }[], inLanguage: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage,
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
}

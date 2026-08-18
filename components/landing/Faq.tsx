import { faq, faqTitle, type LandingView } from "@/lib/landingCopy";

/* FAQ — questions as native <details>, answers from lib/landingCopy.ts.
   On "/" every question; on a tabbed view only the ones tagged for it. */
export default function Faq({ view = "all" }: { view?: LandingView }) {
  const items = view === "all" ? faq : faq.filter((f) => (f.on as string[]).includes(view));
  return (
    <section id="faq" className="relative z-[1] scroll-mt-20 border-t border-l-line px-6 py-24 sm:px-8">
      <div className="mx-auto grid max-w-[1160px] gap-10 lg:grid-cols-[1fr_2fr]">
        <h2 className="font-display text-[clamp(36px,5vw,56px)] leading-[1.02] tracking-tight text-l-text">
          {faqTitle}
        </h2>
        <ul className="divide-y divide-l-line border-y border-l-line">
          {items.map((f) => (
            <li key={f.q}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-[clamp(20px,2.2vw,26px)] leading-tight tracking-tight text-l-text">
                    {f.q}
                  </span>
                  <span
                    aria-hidden
                    className="relative h-5 w-5 flex-none text-l-text-3 transition-transform duration-300 group-open:rotate-45 group-open:text-l-accent"
                  >
                    <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
                    <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-current" />
                  </span>
                </summary>
                <p className="max-w-[60ch] pb-6 text-[15px] leading-[1.65] text-l-text-2">{f.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

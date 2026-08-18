import FeatureIcon from "@/components/landing/FeatureIcon";
import type { FeatureRow } from "@/lib/landingCopy";

/*
  The feature rows beside a closer — an icon and a title per row, a "+" that
  opens the detail. Native <details>, so it is keyboard-accessible and needs
  no script; the "+" turns into a "×" when open. The accent (blue or gold) is
  the section's --sa, set by the caller.
*/
export default function FeatureList({ kicker, rows }: { kicker: string; rows: FeatureRow[] }) {
  return (
    <div className="w-full max-w-[520px]">
      <div className="mb-3 font-mono text-[11px] tracking-[0.14em] uppercase text-(--sa)">{kicker}</div>
      <ul className="divide-y divide-l-line border-y border-l-line">
        {rows.map((r) => (
          <li key={r.title}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-4 py-3.5 text-left [&::-webkit-details-marker]:hidden">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-l-line bg-l-bg-elevated text-(--sa)">
                  <FeatureIcon name={r.icon} />
                </span>
                <span className="flex-1 font-display text-[clamp(19px,1.8vw,23px)] leading-tight tracking-tight text-l-text">
                  {r.title}
                </span>
                <span
                  aria-hidden
                  className="relative h-5 w-5 flex-none text-l-text-3 transition-transform duration-300 group-open:rotate-45 group-open:text-(--sa)"
                >
                  <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
                  <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-current" />
                </span>
              </summary>
              <p className="max-w-[46ch] pb-4 pl-[52px] text-[14px] leading-[1.6] text-l-text-2">{r.detail}</p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

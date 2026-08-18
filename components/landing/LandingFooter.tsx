import Link from "next/link";
import { footer } from "@/lib/landingCopy";

/* The footer. Everything here is meant to be READ — the tagline, the two
   legal links, the unaffiliated line — so nothing is in text-3 (2.7:1 on this
   ground); text-2 clears AA at these sizes. */
export default function LandingFooter() {
  return (
    <footer className="relative z-[1] border-t border-l-line px-6 py-10 sm:px-8">
      <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 font-mono text-xs tracking-wide text-l-text-2">
          <Link href="/" className="font-display text-lg italic tracking-tight text-l-text">
            UNI<span className="text-l-accent">sport</span>
          </Link>
          <span className="h-3.5 w-px bg-l-line" />
          <span>{footer.tagline}</span>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {/* Google's brand verification checks the privacy policy is reachable
              and linked from the homepage, so these stay in the footer. */}
          <div className="flex items-center gap-4 font-mono text-[12px] tracking-wide">
            <Link href="/privacy" className="text-l-text-2 transition-colors hover:text-l-text">
              {footer.privacy}
            </Link>
            <span className="h-3 w-px bg-l-line" />
            <Link href="/terms" className="text-l-text-2 transition-colors hover:text-l-text">
              {footer.terms}
            </Link>
          </div>
          <div className="font-mono text-[12px] tracking-wide text-l-text-2">{footer.unaffiliated}</div>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="relative z-[1] border-t border-l-border px-6 py-10 sm:px-8">
      <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 font-mono text-xs tracking-wide text-l-text-3">
          <Link href="/" className="font-display text-lg italic tracking-tight text-l-text">
            UNI<span className="text-l-accent">sport</span>
          </Link>
          <span className="h-3.5 w-px bg-l-border" />
          <span>Built at Harvard, for every campus</span>
        </div>
        <div className="font-mono text-[11px] tracking-wide text-l-text-3">
          Officially unaffiliated with Harvard University
        </div>
      </div>
    </footer>
  );
}

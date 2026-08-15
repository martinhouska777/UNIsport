import Link from "next/link";

/*
  Sticky top bar for the landing. Two ways in, because there genuinely are two:
  students sign themselves up, while a varsity athlete arrives holding a link
  their captain sent. The varsity route is quiet and gold — secondary for most
  visitors, but the first thing a rower is looking for.
*/
export default function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-l-border bg-l-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-[18px] sm:px-8">
        <Link
          href="/"
          className="font-display text-2xl italic tracking-tight text-l-text"
        >
          UNI<span className="text-l-accent">sport</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            href="/join"
            className="rounded-full border border-l-varsity-soft px-3.5 py-2 text-[13px] font-medium tracking-tight text-l-varsity transition-colors hover:border-l-varsity hover:bg-l-varsity-dim sm:px-[18px] sm:text-sm"
          >
            Team invite
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-l-text px-[18px] py-2.5 text-sm font-medium tracking-tight text-l-bg transition-colors hover:bg-l-accent hover:text-l-text"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

import Link from "next/link";

// Sticky top bar for the landing. Wordmark + a single "Get Started" CTA
// that drops the visitor into the student sign-in.
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
        <Link
          href="/login"
          className="rounded-full bg-l-text px-[18px] py-2.5 text-sm font-medium tracking-tight text-l-bg transition-colors hover:bg-l-accent hover:text-l-text"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}

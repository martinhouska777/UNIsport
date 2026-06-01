import Link from "next/link";

// Closing call-to-action — sends the student into sign-in.
export default function FinalCta() {
  return (
    <section className="relative z-[1] px-6 py-32 text-center sm:px-8 lg:py-40">
      <div className="mx-auto max-w-[760px]">
        <h2 className="mb-10 font-display text-[clamp(48px,7.5vw,96px)] font-normal leading-[0.98] tracking-tight text-l-text">
          Stop training <em className="italic text-l-accent">alone.</em>
        </h2>
        <Link
          href="/login"
          className="group mb-6 inline-flex items-center gap-2.5 rounded-full bg-l-accent px-10 py-5 text-[17px] font-medium text-l-text transition-transform hover:-translate-y-0.5"
        >
          Get started with your email
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-1">
            <path
              d="M3 7H11M11 7L7 3M11 7L7 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <p className="font-mono text-xs tracking-wide text-l-text-3">
          Free for students <span className="text-l-text-2">·</span> Available now at Harvard
        </p>
      </div>
    </section>
  );
}

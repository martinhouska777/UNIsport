// "How it works" — three steps. Copy reflects the REAL sign-in we ship
// (email + password, or Google), not the mockup's magic-link pitch.
const STEPS: { n: string; title: string; desc: string; mono: string }[] = [
  {
    n: "1",
    title: "Create your account",
    desc: "Sign up with your email and a password — or continue with Google. No waiting, no approval queue.",
    mono: "30 SECONDS",
  },
  {
    n: "2",
    title: "Set up your profile",
    desc: "Your house, gym, schedule, training style, and level. Edit anything later from your profile tab.",
    mono: "60 SECONDS",
  },
  {
    n: "3",
    title: "Find a partner. Train.",
    desc: "Browse matches, search a specific session, open a community channel — start training right away.",
    mono: "RIGHT AWAY",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative z-[1] mx-auto max-w-[1280px] px-6 py-24 sm:px-8 lg:py-32">
      <div className="mb-16 text-center lg:mb-20">
        <div className="mb-4 flex items-center justify-center gap-3 font-mono text-[11px] uppercase tracking-widest text-l-text-2">
          <span className="h-px w-6 bg-l-accent" />
          How it works
        </div>
        <h2 className="mx-auto mb-4 max-w-[760px] font-display text-[clamp(34px,5vw,56px)] font-normal leading-[1.05] tracking-tight text-l-text">
          From sign-up to your first session in under <em className="italic text-l-text-2">two minutes.</em>
        </h2>
        <p className="mx-auto max-w-[580px] text-[17px] leading-relaxed text-l-text-2">
          Email and a password, or one tap with Google. That&apos;s the whole gate.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-0">
        {/* connector line behind the step numbers (desktop only) */}
        <span className="pointer-events-none absolute left-[12%] right-[12%] top-8 hidden h-px bg-gradient-to-r from-transparent via-l-border-hover to-transparent lg:block" />
        {STEPS.map((s) => (
          <div key={s.n} className="relative px-5 text-center">
            <div className="relative z-[1] mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-l-border-hover bg-l-bg font-display text-[28px] italic text-l-accent">
              {s.n}
            </div>
            <h3 className="mb-2.5 font-display text-2xl font-normal tracking-tight text-l-text">
              {s.title}
            </h3>
            <p className="mx-auto max-w-[280px] text-[15px] leading-relaxed text-l-text-2">{s.desc}</p>
            <p className="mt-4 font-mono text-[11px] tracking-widest text-l-text-3">{s.mono}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

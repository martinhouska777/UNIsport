// Brand statement band. Aspirational positioning (the owner's vision copy),
// kept as written — it makes no claim about the sign-in mechanism.
export default function Exclusivity() {
  return (
    <section className="relative z-[1] overflow-hidden border-y border-l-border px-6 py-32 sm:px-8 lg:py-40">
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-l-accent-dim)_0%,transparent_40%)] opacity-60" />
      <div className="relative mx-auto max-w-[880px] text-center">
        <div className="mb-10 inline-flex items-center gap-2.5 rounded-full border border-l-border-hover bg-l-surface/60 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-l-text-2 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-l-success shadow-[0_0_8px_var(--color-l-success)]" />
          Members-only
        </div>
        <h2 className="mb-7 font-display text-[clamp(40px,6vw,72px)] font-normal leading-[1.02] tracking-tight text-l-text">
          Verified. Unofficial.
          <br />
          Built by <em className="italic text-l-accent">students.</em>
        </h2>
        <p className="mx-auto max-w-[620px] text-[18px] leading-relaxed text-l-text-2">
          Your campus email is your membership. Every gym, every partner, every channel is locked to
          your school. Officially unaffiliated with any university — by design.
        </p>
      </div>
    </section>
  );
}

// The five-layer feature grid. Cards 01–04 use the blue student accent,
// card 05 (Varsity) uses the gold varsity accent.
type Feature = {
  n: string;
  title: string;
  desc: string;
  tag: React.ReactNode;
  icon: React.ReactNode;
  varsity?: boolean;
};

const FEATURES: Feature[] = [
  {
    n: "01",
    title: "Every gym on campus, mapped.",
    desc: "Real photos, full equipment lists, hours, and live crowd levels — for every gym at your university, in one place.",
    tag: (
      <>
        Shot by students <Sep /> Updated weekly
      </>
    ),
    icon: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <path d="M9 22V12h6v10" />
      </>
    ),
  },
  {
    n: "02",
    title: "Find your training partner.",
    desc: "Matched by gym, schedule, level, and training type. Verified students only — no requests, no waiting, just train.",
    tag: (
      <>
        Compatibility scored <Sep /> AI-described matches
      </>
    ),
    icon: (
      <>
        <circle cx="9" cy="7" r="3" />
        <circle cx="17" cy="11" r="3" />
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      </>
    ),
  },
  {
    n: "03",
    title: "Log every session. Build every plan.",
    desc: "Track lifts, runs, and workouts. Build your own programs. Streaks, calendar history, and personal records — all permanent.",
    tag: (
      <>
        Snapchat-style streaks <Sep /> Session calendar
      </>
    ),
    icon: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 4 5-7" />
      </>
    ),
  },
  {
    n: "04",
    title: "Your campus fitness feed.",
    desc: "Open channels for nutrition, form, PRs, and running. Everyone at your school is already in — no followers needed.",
    tag: (
      <>
        5 open channels <Sep /> Per-house leaderboard
      </>
    ),
    icon: (
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    ),
  },
  {
    n: "05",
    title: "Varsity Mode — for athletes.",
    desc: "A gated upgrade for varsity teams. Training plans, lineups, performance data — unlocked by your team captain.",
    varsity: true,
    tag: (
      <>
        Captain-approved <Sep varsity /> Sport-specific
      </>
    ),
    icon: (
      <>
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0012 0V2z" />
      </>
    ),
  },
];

function Sep({ varsity = false }: { varsity?: boolean }) {
  return <span className={varsity ? "text-l-varsity" : "text-l-accent"}>·</span>;
}

export default function Features() {
  return (
    <section className="relative z-[1] mx-auto max-w-[1280px] px-6 py-20 sm:px-8 lg:py-28">
      <div className="mb-14">
        <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-l-text-2">
          <span className="h-px w-6 bg-l-accent" />
          The platform
        </div>
        <h2 className="mb-4 max-w-[760px] font-display text-[clamp(34px,5vw,56px)] font-normal leading-[1.05] tracking-tight text-l-text">
          Built for every student. <em className="italic text-l-text-2">Made for every campus.</em>
        </h2>
        <p className="max-w-[580px] text-[17px] leading-relaxed text-l-text-2">
          A complete fitness platform with five layers, locked to your university by .edu
          verification. The deeper you go, the more it does.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <article
            key={f.n}
            className="group relative overflow-hidden rounded-[20px] border border-l-border bg-l-bg-elevated px-[26px] py-7 transition-transform hover:-translate-y-[3px] hover:border-l-border-hover"
          >
            {/* hover top highlight line */}
            <span
              className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-50 ${
                f.varsity ? "via-l-varsity" : "via-l-accent"
              }`}
            />
            <span className="absolute right-[26px] top-[22px] font-mono text-[11px] tracking-widest text-l-text-3">
              {f.n}
            </span>
            <div
              className={`mb-[22px] flex h-[42px] w-[42px] items-center justify-center rounded-[11px] border ${
                f.varsity
                  ? "border-l-varsity-soft bg-l-varsity-dim text-l-varsity"
                  : "border-l-accent-soft bg-l-accent-dim text-l-accent"
              }`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {f.icon}
              </svg>
            </div>
            <h3 className="mb-2.5 font-display text-2xl font-normal leading-[1.15] tracking-tight text-l-text">
              {f.title}
            </h3>
            <p className="text-[14.5px] leading-relaxed text-l-text-2">{f.desc}</p>
            <p className="mt-[18px] border-t border-l-border pt-[18px] font-mono text-[11px] tracking-wide text-l-text-3">
              {f.tag}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

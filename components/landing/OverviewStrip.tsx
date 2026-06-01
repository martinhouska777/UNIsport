// Thin strip under the hero summarising the five layers of the platform.
const PILLS: { label: string; icon: React.ReactNode; varsity?: boolean }[] = [
  {
    label: "Gym Discovery",
    icon: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
  },
  {
    label: "Partner Matching",
    icon: (
      <>
        <circle cx="9" cy="7" r="3" />
        <circle cx="17" cy="11" r="3" />
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      </>
    ),
  },
  {
    label: "Session Logging",
    icon: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 4 5-7" />
      </>
    ),
  },
  {
    label: "Community",
    icon: (
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    ),
  },
  {
    label: "Varsity Mode",
    varsity: true,
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

export default function OverviewStrip() {
  return (
    <div className="relative z-[1] border-y border-l-border bg-l-bg-elevated py-6">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 sm:px-8">
        <div className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-l-text-3">
          Five layers, one platform
        </div>
        <div className="flex flex-wrap gap-2">
          {PILLS.map((pill) => (
            <div
              key={pill.label}
              className="inline-flex items-center gap-2 rounded-full border border-l-border bg-l-bg px-3.5 py-2 text-[13px] font-medium tracking-tight text-l-text-2"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`h-3.5 w-3.5 ${pill.varsity ? "text-l-varsity" : "text-l-accent"}`}
              >
                {pill.icon}
              </svg>
              {pill.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

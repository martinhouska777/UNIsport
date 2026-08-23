/*
  THE APP'S VARSITY TAB BAR, drawn rather than captured.

  The recoloured Varsity Home captures (public/landing/closers/vhome-*.webp)
  stop ABOVE the app's own tab bar, so every phone that shows one has to draw
  it: Home · Calendar · + · Team · Profile, in the school's colour. Blade Lock
  drew it inline; the intro's backdrop phones need the same bar, so it lives
  here once.

  Sized in container units (cqw), like the rest of the phone, so it is the same
  bar at 230px as at 272px. `ink` is the school's legible colour — DATA, applied
  inline (rule 1's content exception).
*/
const TABS: { label: string; d: string }[] = [
  { label: "Home", d: "M4 11l8-6 8 6v8h-5v-5H9v5H4z" },
  { label: "Calendar", d: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" },
  { label: "", d: "" },
  {
    label: "Team",
    d: "M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-4.5 6-4.5S15 16 15 19M17 10a2.5 2.5 0 1 0 0-5M16 14c3 0 5 1.5 5 4",
  },
  { label: "Profile", d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6" },
];

export default function VarsityTabBar({ ink, transition = "" }: { ink: string; transition?: string }) {
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 bottom-0 z-[2] flex h-[12%] items-center justify-around border-t border-l-phone-line bg-l-phone-screen pb-[1.6%]"
    >
      {TABS.map((t, i) =>
        t.label ? (
          <span
            key={t.label}
            className={`flex flex-col items-center gap-[2px] leading-none text-l-phone-ink-2 ${transition}`}
            style={i === 0 ? { color: ink } : undefined}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[5.5cqw] w-[5.5cqw]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={t.d} />
            </svg>
            <b className="font-sans text-[2.4cqw] font-semibold tracking-[0.02em]">{t.label}</b>
          </span>
        ) : (
          <span
            key="plus"
            className={`-mt-[8%] flex aspect-square w-[16%] items-center justify-center rounded-full text-l-phone-screen shadow-md ring-[5px] ring-l-phone-screen/90 ${transition} transition-[background-color]`}
            style={{ background: ink }}
          >
            <svg viewBox="0 0 24 24" className="h-[48%] w-[48%]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 4v16M4 12h16" />
            </svg>
          </span>
        ),
      )}
    </div>
  );
}

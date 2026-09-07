/*
  The small parts every League section is built from, in one place so the four
  sections cannot drift apart — a bar on the challenges screen and a bar on the
  house card have to be the same bar, or the screen stops reading as one thing.

  All color is theme tokens (rule 1). The one exception is the optional `tint`,
  which callers pass a HOUSE identity color from lib/gyms.ts — content data,
  applied inline, the same exception the gym and lineup screens use.
*/

export const ordinal = (n: number): string => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

/* The top three are marked with the theme's accent rather than gold/silver/
   bronze: medal colors would be three hardcoded hexes in a component, which is
   the one thing this codebase never does. */
export function RankBadge({ rank }: { rank: number }) {
  const top = rank <= 3;
  return (
    <span
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold ${
        top ? "bg-accent-tint text-accent" : "text-muted"
      }`}
    >
      {rank}
    </span>
  );
}

/** A bar that fills. Used by the level cards and by every challenge row. */
export function Bar({ fraction, tint }: { fraction: number; tint?: string | null }) {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500"
        style={{
          width: `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`,
          ...(tint ? { background: tint } : {}),
        }}
      />
    </div>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-2.5 py-2.5 text-center">
      <div className="truncate text-[17px] font-medium leading-none text-text">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.07em] text-muted">{label}</div>
    </div>
  );
}

/** The two- or three-way switch at the top of a section. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`tap44 flex-1 rounded-lg py-2 text-[12px] font-semibold transition-colors ${
            value === o.key ? "bg-text text-background" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center text-[12px] leading-relaxed text-muted">
      {children}
    </div>
  );
}

export function Loading() {
  return <div className="px-4 py-16 text-center text-[12px] text-muted">Counting…</div>;
}

/*
  LEVEL AVATAR — a person's initials wearing the border their level earned.
  ---------------------------------------------------------------------------
  This is the part of the League other people SEE. A number on a board is
  private; a border on your face everywhere you appear is status, and status is
  what makes anyone care. So the ring goes wherever a person does — the boards,
  Match, a profile — and never only on your own screen.

  FIVE TIERS, and only the tier is decided in code (lib/xp.ts `ringTier`):
    0  Lvl 1–2   no ring
    1  Lvl 3–4   a thin one
    2  Lvl 5–6   solid
    3  Lvl 7–8   a gradient
    4  Lvl 9+    gradient, and a notch

  THE COLOURS ARE NOT HARDCODED (rule 1). They come from the school theme
  (--primary, --accent) so the ring re-skins with the university like
  everything else, tinted with the person's own HOUSE colour when we know it —
  the same per-entity content-colour exception the gym cards and the lineup
  card use. A Winthrop Level 8 and an Eliot Level 8 read as related but not
  identical, and neither is a hex in a component.

  The outer size never changes with the tier, so a grid of Match cards does not
  reflow as people level up.
*/
import InitialsAvatar from "@/components/ui/InitialsAvatar";
import { ringTier } from "@/lib/xp";
import type { HouseColors } from "@/lib/gyms";

/** How thick the band is, per tier. Tier 0 keeps the space and paints nothing. */
const RING_WIDTH: Record<number, number> = { 0: 2, 1: 2, 2: 2.5, 3: 3, 4: 3 };

function ringPaint(tier: number, colors?: HouseColors | null): string | undefined {
  const own = colors?.primary;
  switch (tier) {
    case 1:
      return own
        ? `color-mix(in oklab, ${own} 45%, transparent)`
        : "var(--color-primary-line)";
    case 2:
      return own ?? "var(--primary)";
    case 3:
    case 4:
      return `linear-gradient(135deg, ${own ?? "var(--primary)"}, var(--accent))`;
    default:
      return undefined; // tier 0 — no ring at all
  }
}

export default function LevelAvatar({
  name,
  level,
  size = 40,
  colors,
  badge = false,
  className = "",
}: {
  name: string;
  level: number;
  /** The avatar's own diameter; the ring is drawn outside it. */
  size?: number;
  colors?: HouseColors | null;
  /** Show the level as a small number on the corner. */
  badge?: boolean;
  className?: string;
}) {
  const tier = ringTier(level);
  const width = RING_WIDTH[tier] ?? 2;
  const paint = ringPaint(tier, colors);
  const outer = size + width * 2;

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: outer, height: outer }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full"
        style={paint ? { background: paint } : undefined}
      >
        <InitialsAvatar name={name} size={size} colors={colors ?? null} />
      </div>

      {/* Tier 4's notch: the small mark that says "this one is past nine". */}
      {tier === 4 && !badge && (
        <span
          aria-hidden
          className="absolute -bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent ring-2 ring-surface"
        />
      )}

      {badge && (
        <span
          className="absolute -bottom-1 -right-1 flex min-w-[16px] items-center justify-center rounded-full border border-surface bg-text px-1 text-[9px] font-semibold leading-[15px] text-background"
          aria-label={`Level ${level}`}
        >
          {level}
        </span>
      )}
    </div>
  );
}

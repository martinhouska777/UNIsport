/*
  INITIALS AVATAR — a person's initials in a circle, worn in their house's
  colours when we know the house.

  Every Match card used to show the same grey person-glyph, so a grid of results
  read as a grid of empty slots (#24 in the audit). Initials cost nothing, tell
  the two people apart at a glance, and the house colour ties a person to the
  same identity system the house gym cards already use.

  The colours are per-entity CONTENT data out of lib/gyms.ts applied via inline
  style — never a hardcoded color in a component (rule 1). Without a house
  (freshmen in Yard dorms, or anyone who skipped it) it falls back to the
  theme's own primary tint, exactly the look the glyph had.
*/
import type { HouseColors } from "@/lib/gyms";

/** "Martin Houska" → "MH"; a single name → its first letter. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.length === 1 ? [parts[0][0]] : [parts[0][0], parts[parts.length - 1][0]];
  return letters.join("").toUpperCase();
}

/*
  Whether black or white text reads on a given colour. Standard sRGB relative
  luminance — the house palette runs from pale silver to near-black, so this
  can't be a fixed choice.

  0.179 is where the two contrast ratios cross, NOT the midpoint: a mid-tone
  like Mather's gold looks bright but still carries black far better than white
  (9.5:1 against 2.2:1). Splitting at 0.5 is the common mistake and it made the
  gold houses unreadable.
*/
function readableOn(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.179 ? "#111111" : "#ffffff";
}

export default function InitialsAvatar({
  name,
  size = 48,
  colors,
  className = "",
}: {
  name: string;
  size?: number;
  /** The person's house colours, or null for the neutral theme fallback. */
  colors?: HouseColors | null;
  className?: string;
}) {
  const initials = initialsOf(name || "");
  const style: React.CSSProperties = { width: size, height: size, fontSize: Math.round(size * 0.36) };

  if (colors) {
    style.background = colors.primary;
    style.color = readableOn(colors.primary);
    style.borderColor = colors.secondary;
  }

  return (
    <div
      aria-hidden
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 font-semibold ${
        colors ? "" : "border-primary bg-primary-tint text-primary"
      } ${className}`}
      style={style}
    >
      {initials}
    </div>
  );
}

import { IconUser } from "@/components/icons";
import InitialsAvatar, { initialsOf } from "@/components/ui/InitialsAvatar";
import type { HouseColors } from "@/lib/gyms";

/*
  Round user avatar used across the Messages tab. When a photo `src` is given it
  shows the real picture; otherwise the person's initials — in their HOUSE
  colours when `colors` is known, exactly as on the Match grid, so one person
  looks like one person on both tabs (launch audit, 2026-09-27); on the
  theme's primary tint when it isn't. Without a name at all it falls back to
  the neutral glyph.
*/
export default function Avatar({
  size = 48,
  src,
  alt,
  name,
  colors,
}: {
  size?: number;
  src?: string | null;
  alt?: string;
  /** Whose avatar this is — drives the initials fallback. */
  name?: string | null;
  /** Their house colours (lib/cohorts.ts teamFor), when known. */
  colors?: HouseColors | null;
}) {
  const label = name || alt || "";
  if (!src && label && colors) return <InitialsAvatar name={label} size={size} colors={colors} />;
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primary-tint font-semibold text-primary"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt || "Profile photo"} className="h-full w-full object-cover" />
      ) : label ? (
        initialsOf(label)
      ) : (
        <IconUser size={Math.round(size * 0.42)} />
      )}
    </div>
  );
}

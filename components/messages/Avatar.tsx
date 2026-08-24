import { IconUser } from "@/components/icons";
import { initialsOf } from "@/components/ui/InitialsAvatar";

/*
  Round user avatar used across the Messages tab. When a photo `src` is given it
  shows the real picture; otherwise it falls back to the person's initials on
  the theme's primary tint (no per-user colors here — the house colours belong
  to the Match grid, where telling twenty strangers apart is the whole job).
  Without a name at all it falls back to the neutral glyph.
*/
export default function Avatar({
  size = 48,
  src,
  alt,
  name,
}: {
  size?: number;
  src?: string | null;
  alt?: string;
  /** Whose avatar this is — drives the initials fallback. */
  name?: string | null;
}) {
  const label = name || alt || "";
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

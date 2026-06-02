import { IconUser } from "@/components/icons";

/*
  Round user avatar used across the Messages tab. When a photo `src` is given it
  shows the real picture; otherwise it falls back to the theme's primary tint +
  user glyph (no per-user colors — keeps rule 1 intact).
*/
export default function Avatar({
  size = 48,
  src,
  alt,
}: {
  size?: number;
  src?: string | null;
  alt?: string;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primary/15 text-primary"
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt || "Profile photo"} className="h-full w-full object-cover" />
      ) : (
        <IconUser size={Math.round(size * 0.42)} />
      )}
    </div>
  );
}

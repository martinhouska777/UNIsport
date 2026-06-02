import { IconUser } from "@/components/icons";

/*
  Round user avatar used across the Messages tab. Uses the theme's primary tint
  for everyone (no per-user colors — keeps rule 1 intact).
*/
export default function Avatar({ size = 48 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/15 text-primary"
      style={{ width: size, height: size }}
    >
      <IconUser size={Math.round(size * 0.42)} />
    </div>
  );
}

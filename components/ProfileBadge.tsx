/*
  One VARSITY / MENTOR badge — shared by your own profile and somebody else's,
  so the two never drift apart. Styled as a small Log button (lib/badges.ts).
*/
import { badges, type BadgeKind } from "@/lib/badges";

export default function ProfileBadge({ kind, small = false }: { kind: BadgeKind; small?: boolean }) {
  const b = badges[kind];
  const themed = !b.background;
  return (
    <span
      /* `small`: the pair that sits side by side under someone's photo
         (people/[id], owner 2026-09-30: "smaller and next to each other"). */
      className={`inline-flex select-none items-center font-semibold ${
        small ? "h-4 rounded px-1 text-[8px] tracking-normal" : "h-5 rounded-md px-2 text-[10px] tracking-wide"
      } ${themed ? "bg-primary-live text-primary-contrast" : ""}`}
      style={themed ? undefined : { background: b.background, color: b.text }}
    >
      {b.label}
    </span>
  );
}

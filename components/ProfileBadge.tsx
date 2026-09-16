/*
  One VARSITY / MENTOR badge — shared by your own profile and somebody else's,
  so the two never drift apart. Colours come from lib/badges.ts (data).
*/
import { badges, type BadgeKind } from "@/lib/badges";

export default function ProfileBadge({ kind }: { kind: BadgeKind }) {
  const b = badges[kind];
  return (
    <span
      className="rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide"
      style={{ background: b.background, color: b.text }}
    >
      {b.label}
    </span>
  );
}

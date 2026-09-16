/*
  One VARSITY / MENTOR badge — shared by your own profile and somebody else's,
  so the two never drift apart. Styled as a small Log button (lib/badges.ts).
*/
import { badges, type BadgeKind } from "@/lib/badges";

export default function ProfileBadge({ kind }: { kind: BadgeKind }) {
  const b = badges[kind];
  const themed = !b.background;
  return (
    <span
      className={`inline-flex h-6 select-none items-center rounded-lg px-2.5 text-[11px] font-semibold tracking-wide ${
        themed ? "bg-primary-live text-primary-contrast" : ""
      }`}
      style={themed ? undefined : { background: b.background, color: b.text }}
    >
      {b.label}
    </span>
  );
}

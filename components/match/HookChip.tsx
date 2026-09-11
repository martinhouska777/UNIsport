/*
  The shared-fact chip on a row: "Both into Climbing", in the school's colour
  with a tick, so the eye finds the reason before the name. Nothing is drawn
  when there is no shared fact — an empty chip would be a claim.
*/
import type { Hook } from "@/lib/matchReasons";
import { IconCheck } from "@/components/icons";

export default function HookChip({ hook }: { hook: Hook | null }) {
  if (!hook) return null;
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-primary-line bg-primary-tint px-1.5 py-0.5 text-[11px] font-medium leading-tight text-primary">
      <span className="flex-shrink-0" aria-label="You share this">
        <IconCheck size={10} />
      </span>
      <span className="truncate">{hook.text}</span>
    </span>
  );
}

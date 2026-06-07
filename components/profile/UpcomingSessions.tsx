"use client";

/*
  UPCOMING SESSIONS — the Profile tab's reminder of accepted, still-to-happen
  sessions planned in chat (Slice C). Soonest first; "Today"/"Tomorrow" stand
  out. Tapping a row reopens that conversation (where the plan card lives, so you
  can confirm it afterwards). Hidden entirely when there's nothing upcoming.
  Colors are theme tokens (rule 1).
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listUpcomingPlans, type UpcomingPlan } from "@/lib/supabase/sessionPlans";
import { startDirectConversation } from "@/lib/supabase/messages";
import { activityLabel } from "@/lib/supabase/workouts";
import { IconCalendar, IconChevronRight } from "@/components/icons";

// "Today · 5:00 PM" / "Tomorrow · 7:30 AM" / "Fri, Jun 13 · 3:00 PM".
function whenLabel(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const day0 = new Date();
  day0.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - day0.getTime()) / 86400000);
  if (diff === 0) return `Today · ${time}`;
  if (diff === 1) return `Tomorrow · ${time}`;
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${day} · ${time}`;
}

export default function UpcomingSessions() {
  const router = useRouter();
  const [plans, setPlans] = useState<UpcomingPlan[] | null>(null);

  useEffect(() => {
    let active = true;
    listUpcomingPlans()
      .then((p) => active && setPlans(p))
      .catch(() => active && setPlans([]));
    return () => {
      active = false;
    };
  }, []);

  if (!plans || plans.length === 0) return null;

  const open = async (p: UpcomingPlan) => {
    try {
      const cid = await startDirectConversation(p.otherId);
      router.push(`/messages?dm=${cid}&name=${encodeURIComponent(p.otherName)}`);
    } catch {
      // Ignore — tapping just won't navigate if the DM can't be opened.
    }
  };

  return (
    <div className="border-b border-border px-3.5 py-3">
      <div className="mb-2 text-[9px] font-medium uppercase tracking-[0.1em] text-primary">
        Upcoming sessions
      </div>
      <div className="flex flex-col gap-2">
        {plans.map((p) => (
          <button
            key={p.planId}
            type="button"
            onClick={() => open(p)}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-3 text-left active:opacity-80"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <IconCalendar size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-text">
                {activityLabel(p.activity)} with {p.otherName}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted">
                {whenLabel(p.scheduledAt)}
                {p.place ? ` · ${p.place}` : ""}
              </span>
            </span>
            <IconChevronRight size={16} className="shrink-0 text-muted" />
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

/*
  ADD TO CALENDAR — on an accepted session, in the chat's plan card and on the
  Profile tab's Upcoming sessions. One button; pressed, it becomes the two
  calendars. Apple opens the calendar file (the iPhone shows its own Add
  sheet), Google opens its new-event page already filled in. No account is
  connected (lib/calendarEvent.ts).

  Filled in the school colour, each with its maker's mark (owner, 2026-10-11:
  white pills on the white card "looks strange"). Google's G keeps its own four
  colours, so it is an image (public/brands/google-g.svg) on a small white disc,
  not a colour written into this file (rule 1).
*/
import { useState } from "react";
import Button, { buttonClass } from "@/components/ui/Button";
import { IconApple, IconCalendar } from "@/components/icons";
import { appleCalendarHref, googleCalendarHref, planEvent } from "@/lib/calendarEvent";

export default function AddToCalendar({
  plan,
  className = "",
}: {
  plan: { planId: string; activity: string; otherName: string; place: string | null; scheduledAt: string };
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} className={`w-full ${className}`}>
        <IconCalendar size={14} /> Add to calendar
      </Button>
    );
  }
  // Plain <a>, not <Link>: neither is a page of the app (a file, and Google).
  const pill = buttonClass({ size: "sm", className: "flex-1" });
  return (
    <div className={`flex gap-2 ${className}`}>
      <a href={appleCalendarHref(plan.planId)} className={pill}>
        <IconApple size={14} /> Apple Calendar
      </a>
      <a href={googleCalendarHref(planEvent(plan))} target="_blank" rel="noopener noreferrer" className={pill}>
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-primary-contrast">
          {/* eslint-disable-next-line @next/next/no-img-element -- a 12px mark, nothing to optimise */}
          <img src="/brands/google-g.svg" width={12} height={12} alt="" />
        </span>
        Google Calendar
      </a>
    </div>
  );
}

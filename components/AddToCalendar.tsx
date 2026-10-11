"use client";

/*
  ADD TO CALENDAR — on an accepted session, in the chat's plan card and on the
  Profile tab's Upcoming sessions. One button; pressed, it becomes the two
  calendars. Apple opens the calendar file (the iPhone shows its own Add
  sheet), Google opens its new-event page already filled in. No account is
  connected (lib/calendarEvent.ts).
*/
import { useState } from "react";
import Button, { buttonClass } from "@/components/ui/Button";
import { IconCalendar } from "@/components/icons";
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
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className={`w-full ${className}`}>
        <IconCalendar size={14} /> Add to calendar
      </Button>
    );
  }
  // Plain <a>, not <Link>: neither is a page of the app (a file, and Google).
  const pill = buttonClass({ variant: "secondary", size: "sm", className: "flex-1" });
  return (
    <div className={`flex gap-2 ${className}`}>
      <a href={appleCalendarHref(plan.planId)} className={pill}>
        Apple Calendar
      </a>
      <a href={googleCalendarHref(planEvent(plan))} target="_blank" rel="noopener noreferrer" className={pill}>
        Google Calendar
      </a>
    </div>
  );
}

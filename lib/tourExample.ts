/*
  THE EXAMPLE INVITE — the chat the app walk shows when nobody has planned a
  session with you yet.
  ---------------------------------------------------------------------------
  The walk's Messages part opens the chat where someone planned a session with
  you, you accept it, and it shows on your Profile and in your calendar
  (lib/tour.ts). When a real invite is waiting, that one is used, and accepted
  for real. Most people taking the walk have none — every new student, and a
  demo account after its first run — and the whole part used to be skipped for
  them (owner, 2026-10-03: "I still don't see the messages"). They get this one.

  It lives in this tab only, and only while the walk is on screen. Nothing is
  written to the database and nobody is told: Accept just turns the card into
  "You're on". When the walk ends it is gone — from Messages, from Upcoming
  sessions and from the calendar.

  Who sends it and what it says is data, here (rule 7). The place is the
  school's first main gym, so it is a real gym at whichever school you are.
*/
import { useSyncExternalStore } from "react";
import { gymsFor } from "@/lib/gyms";
import type { DmConversation, DmMessage } from "@/lib/supabase/messages";
import { planWhenLabel, type UpcomingPlan } from "@/lib/supabase/sessionPlans";
import { activityLabel } from "@/lib/supabase/workouts";

/** Its chat and its plan share one id, which no real row can have. */
export const TOUR_EXAMPLE_ID = "tour-example";

const SENDER = {
  id: "tour-example-sender",
  name: "Nina Alvarez",
  message: "Legs tomorrow at 8? Sending you a plan 👇",
};

export type TourExample = {
  otherName: string;
  message: string;
  /** When the message "arrived" — a few minutes before the walk got there. */
  sentAt: string;
  activity: string;
  place: string | null;
  /** Tomorrow, 8:00. */
  scheduledAt: string;
  accepted: boolean;
};

let example: TourExample | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Put the example in front of the walk. Called when no real invite is waiting. */
export function startTourExample(universityKey: string) {
  const at = new Date();
  at.setDate(at.getDate() + 1);
  at.setHours(8, 0, 0, 0);
  example = {
    otherName: SENDER.name,
    message: SENDER.message,
    sentAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    activity: "gym",
    place: gymsFor(universityKey).find((g) => g.kind === "main")?.name ?? null,
    scheduledAt: at.toISOString(),
    accepted: false,
  };
  emit();
}

/** The card's Accept — the only answer the walk ever gives it. */
export function acceptTourExample() {
  if (!example || example.accepted) return;
  example = { ...example, accepted: true };
  emit();
}

/** The walk is over: the example leaves every screen it was on. */
export function endTourExample() {
  if (!example) return;
  example = null;
  emit();
}

export function useTourExample(): TourExample | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => example,
    () => null,
  );
}

export const isTourExample = (id: string | null | undefined) => id === TOUR_EXAMPLE_ID;

/** Its row in Messages: the plan's line last, as a real plan leaves it, unread. */
export function tourExampleChat(e: TourExample): DmConversation {
  return {
    conversationId: TOUR_EXAMPLE_ID,
    otherId: "",
    otherName: e.otherName,
    lastBody: `📅 ${activityLabel(e.activity)} · ${planWhenLabel(e.scheduledAt)}${e.place ? ` · ${e.place}` : ""}`,
    lastAt: e.sentAt,
    lastFromMe: false,
    tick: "sent",
    unread: 2,
  };
}

/** The example's chat, as the thread draws a real one: the message, then the plan. */
export function tourExampleMessages(e: TourExample): DmMessage[] {
  const from = { senderId: SENDER.id, senderName: e.otherName, createdAt: e.sentAt };
  return [
    { id: `${TOUR_EXAMPLE_ID}-text`, ...from, body: e.message, kind: "text" },
    {
      id: `${TOUR_EXAMPLE_ID}-plan`,
      ...from,
      body: "",
      kind: "plan",
      plan: {
        planId: TOUR_EXAMPLE_ID,
        activity: e.activity,
        place: e.place,
        scheduledAt: e.scheduledAt,
        status: e.accepted ? "accepted" : "proposed",
        proposerAnswer: null,
        recipientAnswer: null,
      },
    },
  ];
}

/** Once accepted, the example as Upcoming sessions and the calendar list a plan. */
export function tourExamplePlan(e: TourExample): UpcomingPlan {
  return {
    planId: TOUR_EXAMPLE_ID,
    otherId: SENDER.id,
    otherName: e.otherName,
    activity: e.activity,
    place: e.place,
    scheduledAt: e.scheduledAt,
  };
}

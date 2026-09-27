/*
  THE LOG REMINDER — its words and its deep link, as data.
  ---------------------------------------------------------------------------
  One push, at the hour the student's own schedule says they train (sent by
  app/api/push/remind on a cron). Tapping it opens the Profile tab with the
  log sheet already up, today's date set and their usual gym filled in, so the
  whole thing is the ten seconds the notification promises.

  Shared between the sender and the screen that reads the link, so the two
  can never disagree about the parameter names.
*/

/** The query the Profile tab reads to open the log sheet. Short on purpose. */
export const LOG_LINK_PARAMS = { open: "log", date: "date", gym: "gym" } as const;

/*
  The same link, from a PLANNED SESSION (owner, 2026-09-27): "Yes, we trained"
  on the chat's plan card opens your own Log session sheet with the plan's day,
  activity, place and partner filled in, so what you did is yours to write.
  Saving it is your yes (see LogSessionSheet's `plan`).
*/
const PLAN_LINK_PARAMS = {
  activity: "act",
  plan: "plan",
  partner: "with",
  partnerId: "pid",
  conversation: "conv",
  at: "at",
} as const;

/** The campus (Eastern) calendar day of a plan's start, yyyy-mm-dd. */
export function planCampusDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(iso));
}

/** /profile?log=1&… for logging a planned session. */
export function planLogHref(p: {
  planId: string;
  conversationId: string;
  scheduledAt: string;
  activity: string;
  place: string | null;
  otherId: string;
  otherName: string;
}): string {
  const q = new URLSearchParams();
  q.set(LOG_LINK_PARAMS.open, "1");
  q.set(LOG_LINK_PARAMS.date, planCampusDay(p.scheduledAt));
  if (p.place) q.set(LOG_LINK_PARAMS.gym, p.place);
  q.set(PLAN_LINK_PARAMS.activity, p.activity);
  q.set(PLAN_LINK_PARAMS.plan, p.planId);
  q.set(PLAN_LINK_PARAMS.partner, p.otherName);
  q.set(PLAN_LINK_PARAMS.partnerId, p.otherId);
  q.set(PLAN_LINK_PARAMS.conversation, p.conversationId);
  q.set(PLAN_LINK_PARAMS.at, p.scheduledAt);
  return `/profile?${q.toString()}`;
}

/** What a log link asked for — the reminder's date + gym, and a plan's rest. */
export type LogLink = {
  date: string | null;
  gym: string | null;
  activity?: string;
  partner?: { name: string; id: string };
  plan?: { planId: string; conversationId: string; scheduledAt: string };
};

export const LOG_REMINDER = {
  /** The profile key that switches it off. Missing = on. */
  preferenceKey: "notifyLogReminders" as const,
  title: "Train today? Log it — 10 seconds",
  body: (gym: string) =>
    gym ? `Your usual ${gym} slot is now. Tap to log today's session.` : "Your usual training time is now. Tap to log today's session.",
  /** The full push payload for one person. */
  payload(input: { gym: string; date: string }) {
    const q = new URLSearchParams();
    q.set(LOG_LINK_PARAMS.open, "1");
    q.set(LOG_LINK_PARAMS.date, input.date);
    if (input.gym) q.set(LOG_LINK_PARAMS.gym, input.gym);
    return {
      title: LOG_REMINDER.title,
      body: LOG_REMINDER.body(input.gym),
      url: `/profile?${q.toString()}`,
    };
  },
};

/** Read a deep link's parameters back. Null when the link isn't one. */
export function readLogLink(search: string): LogLink | null {
  const q = new URLSearchParams(search);
  if (q.get(LOG_LINK_PARAMS.open) !== "1") return null;
  const date = q.get(LOG_LINK_PARAMS.date);
  const link: LogLink = {
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    gym: q.get(LOG_LINK_PARAMS.gym),
  };
  const activity = q.get(PLAN_LINK_PARAMS.activity);
  if (activity) link.activity = activity;
  const planId = q.get(PLAN_LINK_PARAMS.plan);
  const partnerId = q.get(PLAN_LINK_PARAMS.partnerId);
  const conversationId = q.get(PLAN_LINK_PARAMS.conversation);
  const at = q.get(PLAN_LINK_PARAMS.at);
  if (planId && partnerId && conversationId && at) {
    link.partner = { name: q.get(PLAN_LINK_PARAMS.partner) || "Partner", id: partnerId };
    link.plan = { planId, conversationId, scheduledAt: at };
  }
  return link;
}

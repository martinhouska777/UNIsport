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
export function readLogLink(search: string): { date: string | null; gym: string | null } | null {
  const q = new URLSearchParams(search);
  if (q.get(LOG_LINK_PARAMS.open) !== "1") return null;
  const date = q.get(LOG_LINK_PARAMS.date);
  return {
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    gym: q.get(LOG_LINK_PARAMS.gym),
  };
}

/*
  WHAT A COMMUNITY CHANNEL LOOKS LIKE: its colour, as data.

  Direction D, picked by the owner on 2026-10-18 out of five drafts (the old
  pink tiles with a thin red icon "look really ai"): every channel is a solid
  circle in a colour of its own with a white icon, like the lists in Apple
  Reminders. The icon key comes from the database (db/messages.sql seeds
  them); this maps it to the circle's colour. These are content colours, one
  per channel, so they live here and are applied inline (CLAUDE.md rule 1).

  #general wears the school's own colour. A channel somebody starts has no
  icon of its own ("message"), so it takes one of MADE_COLOURS, the same one
  every time, chosen from its id. The icon on it is white, except on the
  school's colour, where it is the theme's own contrast colour.
*/

const BY_ICON: Record<string, string> = {
  barbell: "var(--primary)", // #general
  bulb: "#1F2937", // #form & programming
  activity: "#2F7D4F", // #nutrition
  star: "#C9962B", // #wins & PRs
  run: "#2563EB", // #running
};

const MADE_COLOURS = ["#7C3AED", "#0E7490", "#C2410C", "#BE185D", "#4D7C0F", "#4338CA"];

/** A channel's circle and icon colours: by its icon, or for one people made, by its id. */
export function channelColours(icon: string, channelId: string): { bg: string; fg: string } {
  const fixed = BY_ICON[icon];
  if (fixed) return { bg: fixed, fg: fixed === "var(--primary)" ? "var(--primary-contrast)" : "#FFFFFF" };
  let n = 0;
  for (const ch of channelId) n = (n + ch.charCodeAt(0)) % MADE_COLOURS.length;
  return { bg: MADE_COLOURS[n], fg: "#FFFFFF" };
}

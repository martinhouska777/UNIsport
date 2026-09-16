/*
  PROFILE BADGES — VARSITY and MENTOR, as DATA (rule 1's content-colour
  exception, like a house's colours in lib/gyms.ts).

  These are the badges' OWN identity colours, the same at every school and in
  both modes: a bright yellow VARSITY and a bright green MENTOR, each with black
  letters for contrast (owner, 2026-09-16: the old gold-on-grey and
  green-outline pair were too faint). Rendered by components/ProfileBadge.tsx.
*/
export type BadgeKind = "varsity" | "mentor";

export const badges: Record<BadgeKind, { label: string; background: string; text: string }> = {
  varsity: { label: "VARSITY", background: "#facc15", text: "#111111" },
  mentor: { label: "MENTOR", background: "#4ade80", text: "#111111" },
};

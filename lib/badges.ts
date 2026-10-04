/*
  PROFILE BADGES — VARSITY and MENTOR.

  Both are drawn like a small version of the Profile's "Log" button (owner,
  2026-09-16): a filled rounded block with bold letters.

    VARSITY — yellow with dark letters (owner, 2026-10-04: "varsity udělej
              žlutě"; it used to be the school colour).
    MENTOR  — dark green with light letters.

  Each colour is the badge's own identity colour, the same at every school,
  so it lives here as DATA (rule 1's content-colour exception). A badge with
  no colour here falls back to the school colour (theme tokens).

  Rendered by components/ProfileBadge.tsx.
*/
export type BadgeKind = "varsity" | "mentor";

export const badges: Record<BadgeKind, { label: string; background?: string; text?: string }> = {
  varsity: { label: "VARSITY", background: "#facc15", text: "#422006" },
  mentor: { label: "MENTOR", background: "#166534", text: "#f0fdf4" },
};

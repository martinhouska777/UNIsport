/*
  PROFILE BADGES — VARSITY and MENTOR.

  Both are drawn like a small version of the Profile's "Log" button (owner,
  2026-09-16): a filled rounded block with light, bold letters.

    VARSITY — the school colour, exactly the Log button's own (theme tokens).
    MENTOR  — dark green with light letters. That green is the badge's own
              identity colour, the same at every school, so it lives here as
              DATA (rule 1's content-colour exception).

  Rendered by components/ProfileBadge.tsx.
*/
export type BadgeKind = "varsity" | "mentor";

export const badges: Record<BadgeKind, { label: string; background?: string; text?: string }> = {
  varsity: { label: "VARSITY" }, // theme: bg-primary-live / text-primary-contrast
  mentor: { label: "MENTOR", background: "#166534", text: "#f0fdf4" },
};

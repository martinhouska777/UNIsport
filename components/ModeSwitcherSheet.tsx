"use client";

/*
  MODE SWITCHER — the "switch accounts" sheet, but for this app's two modes:
  the normal student app and Varsity Mode.

  Opened from the name in the Profile top bar (student side) and from the
  varsity mark in the Varsity top bar. The mode you're already in is ticked and
  just closes the sheet; the other one navigates. Colors are theme tokens
  (rule 1) so the same sheet reads correctly in both modes' themes.

  The varsity row has three faces, because not everyone is on a team:
    • on a squad   → the team's name and your role; tapping switches mode
    • waiting      → "waiting for your captain", tapping goes to Settings
    • on no team   → "Join a varsity team", tapping goes to the invite screen
*/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import VarsityShield from "@/components/varsity/VarsityShield";
import VarsityCrest from "@/components/varsity/VarsityCrest";
import { useMembership } from "@/components/varsity/useMembership";
import { roleLabel } from "@/lib/varsity/membership";
import { VARSITY_HOME } from "@/lib/varsity/theme";
import { IconCheck, IconChevronRight, IconX } from "@/components/icons";

export default function ModeSwitcherSheet({
  current,
  name,
  onClose,
}: {
  current: "student" | "varsity";
  name?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { membership, isMember, isPending } = useMembership();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const go = (mode: "student" | "varsity") => {
    onClose();
    if (mode === "student") {
      if (current !== "student") router.push("/profile");
      return;
    }
    // Varsity only opens for an approved member; everyone else is pointed at
    // the step that would actually get them in.
    if (isMember) {
      if (current !== "varsity") router.push(VARSITY_HOME);
    } else {
      router.push(isPending ? "/settings" : "/join");
    }
  };

  // What the varsity row says, given where this person stands.
  const varsityLine = isMember
    ? `${membership!.teamName} · ${roleLabel[membership!.role]}`
    : isPending
      ? "Waiting for your captain to let you in"
      : "Join with an invite link from your team";

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="relative rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div className="flex justify-center pb-1.5 pt-2.5">
          <div className="h-1 w-9 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between border-b border-border px-4 pb-3">
          <div>
            <div className="text-[15px] font-medium text-text">Switch mode</div>
            <div className="mt-0.5 text-[11px] text-muted">
              Double-tap your name to switch straight over
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <IconX size={14} />
          </button>
        </div>

        <div className="flex flex-col divide-y divide-border pb-8">
          {/* Student — the normal app */}
          <button
            type="button"
            onClick={() => go("student")}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2"
          >
            {/* The plain shield is the student mark; the oars are varsity's. */}
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2">
              <VarsityShield size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-text">
                {name || "Student"}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted">
                Gyms, matches &amp; sessions
              </span>
            </span>
            {current === "student" ? (
              <IconCheck size={16} className="shrink-0 text-primary" />
            ) : (
              <IconChevronRight size={16} className="shrink-0 text-muted" />
            )}
          </button>

          {/* Varsity — the gated team section */}
          <button
            type="button"
            onClick={() => go("varsity")}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                isMember ? "border-primary/40 bg-primary/10" : "border-border bg-surface-2 opacity-60"
              }`}
            >
              <VarsityCrest size={32} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-text">Varsity</span>
              <span
                className={`mt-0.5 block truncate text-[11px] ${
                  isPending ? "text-warn" : "text-muted"
                }`}
              >
                {varsityLine}
              </span>
            </span>
            {current === "varsity" && isMember ? (
              <IconCheck size={16} className="shrink-0 text-primary" />
            ) : (
              <IconChevronRight size={16} className="shrink-0 text-muted" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

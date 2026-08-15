"use client";

/*
  MODE SWITCHER — the "switch accounts" sheet, but for this app's two modes:
  the normal student app and Varsity Mode.

  Opened from the name in the Profile top bar (student side) and from the
  varsity mark in the Varsity top bar. The mode you're already in is ticked and
  just closes the sheet; the other one navigates. Colors are theme tokens
  (rule 1) so the same sheet reads correctly in both modes' themes.
*/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import VarsityShield from "@/components/varsity/VarsityShield";
import { VARSITY_HOME } from "@/lib/varsity/theme";
import { IconUser, IconCheck, IconChevronRight, IconX } from "@/components/icons";

export default function ModeSwitcherSheet({
  current,
  name,
  photo,
  onClose,
}: {
  current: "student" | "varsity";
  name?: string;
  photo?: string | null;
  onClose: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const go = (mode: "student" | "varsity") => {
    onClose();
    if (mode === current) return;
    router.push(mode === "varsity" ? VARSITY_HOME : "/profile");
  };

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
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 text-muted">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <IconUser size={20} />
              )}
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
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
              <VarsityShield size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-text">Varsity</span>
              <span className="mt-0.5 block truncate text-[11px] text-muted">
                Harvard Rowing · training, lineups &amp; team
              </span>
            </span>
            {current === "varsity" ? (
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

"use client";

/*
  REPORT AND BLOCK, one sheet for every place a person can be reported or
  blocked: their profile, a chat, a channel message, a Sessions board post and a
  gym comment (db/safety_2026-11-07.sql, lib/supabase/safety.ts).

  Instagram's shape: the ⋯ opens two lines, Report and Block, both red.
    Report  → the reasons → "✓ Reported"
    Block   → "Block Lucas?" with Cancel and Block → "✓ Blocked"
  Blocked people are unblocked in Settings > Blocked, or here on a line that
  reads Unblock when they already are.
*/
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { IconChevronRight } from "@/components/icons";
import {
  REPORT_REASONS,
  blockUser,
  fileReport,
  unblockUser,
  useIsBlocked,
  type ReportKind,
} from "@/lib/supabase/safety";

export type ReportTarget = {
  kind: ReportKind;
  targetId?: string | null;
  /** a copy of the words reported, kept with the report */
  body?: string | null;
};

type Step = "menu" | "reasons" | "confirm" | "reported" | "blocked" | "unblocked";

export default function SafetySheet({
  userId,
  name,
  report,
  onClose,
  onBlocked,
}: {
  /** the person: who is blocked, whose post or message is reported */
  userId: string;
  name: string;
  report: ReportTarget;
  onClose: () => void;
  /** after a block: leave the profile or chat that is now hidden */
  onBlocked?: () => void;
}) {
  const blocked = useIsBlocked(userId);
  const [step, setStep] = useState<Step>("menu");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const first = name.trim().split(/\s+/)[0] || "them";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // A tick is the whole answer; the sheet goes by itself a moment later.
  useEffect(() => {
    if (step !== "reported" && step !== "blocked" && step !== "unblocked") return;
    const t = setTimeout(() => {
      onClose();
      if (step === "blocked") onBlocked?.();
    }, 1100);
    return () => clearTimeout(t);
  }, [step, onClose, onBlocked]);

  const run = async (job: () => Promise<void>, done: Step) => {
    setBusy(true);
    setError("");
    try {
      await job();
      setStep(done);
    } catch {
      setError("Couldn’t send. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const line =
    "flex w-full min-h-[52px] items-center gap-3 border-border px-4 text-left text-[15px] transition-colors active:bg-surface-2 [&+&]:border-t disabled:opacity-60";

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="sheet-panel sheet-floor relative max-h-[85%] overflow-y-auto rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div className="flex justify-center pb-1.5 pt-2.5">
          <div className="h-1 w-9 rounded-full bg-border" />
        </div>

        {step === "menu" && (
          <div className="pb-3">
            <button type="button" className={`${line} font-semibold text-danger`} onClick={() => setStep("reasons")}>
              Report
            </button>
            {blocked ? (
              <button
                type="button"
                disabled={busy}
                className={`${line} font-semibold text-text`}
                onClick={() => run(() => unblockUser(userId), "unblocked")}
              >
                Unblock
              </button>
            ) : (
              <button type="button" className={`${line} font-semibold text-danger`} onClick={() => setStep("confirm")}>
                Block
              </button>
            )}
          </div>
        )}

        {step === "reasons" && (
          <div className="pb-3">
            <div className="border-b border-border px-4 pb-3 pt-1 text-center text-base font-semibold text-text">
              Report
            </div>
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                disabled={busy}
                className={`${line} text-text`}
                onClick={() =>
                  run(
                    () =>
                      fileReport({
                        kind: report.kind,
                        userId,
                        targetId: report.targetId,
                        body: report.body,
                        reason,
                      }),
                    "reported",
                  )
                }
              >
                <span className="flex-1">{reason}</span>
                <span className="text-muted">
                  <IconChevronRight size={16} />
                </span>
              </button>
            ))}
          </div>
        )}

        {step === "confirm" && (
          <div className="px-4 pb-5 pt-2">
            <div className="text-center text-base font-semibold text-text">Block {first}?</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" size="lg" full onClick={() => setStep("menu")}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="lg"
                full
                disabled={busy}
                onClick={() => run(() => blockUser(userId), "blocked")}
              >
                Block
              </Button>
            </div>
          </div>
        )}

        {(step === "reported" || step === "blocked" || step === "unblocked") && (
          <div className="px-4 pb-8 pt-4 text-center text-base font-semibold text-text">
            ✓ {step === "reported" ? "Reported" : step === "blocked" ? "Blocked" : "Unblocked"}
          </div>
        )}

        {error && <p className="px-4 pb-4 text-center text-[13px] text-danger">{error}</p>}
      </div>
    </div>
  );
}

/* The ⋯ that opens it, sized like the other icon buttons in a top bar. */
export function MoreButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label="More"
      onClick={onClick}
      className={`tap44 press-icon flex items-center justify-center text-text ${className}`}
    >
      <IconDotsGlyph />
    </button>
  );
}

function IconDotsGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="19" cy="12" r="1.9" />
    </svg>
  );
}

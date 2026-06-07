"use client";

/*
  PARTNERS SHEET — tapped from the Profile "Partners" stat. A bottom sheet listing
  the distinct REAL people you've trained with (from your logged sessions that had
  a picked partner), newest first. Each row shows how many sessions you've done
  together + when you last trained; tapping a row opens that person's profile.

  The whole point is to celebrate variety — meeting NEW people — so the header
  leads with the count of distinct people. Colors are theme tokens (rule 1).
*/
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/messages/Avatar";
import type { PartnerSummary } from "@/lib/supabase/workouts";
import { IconX, IconChevronRight } from "@/components/icons";

// "last trained 12 Jun" style date.
function lastLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function PartnersSheet({
  partners,
  onClose,
}: {
  partners: PartnerSummary[];
  onClose: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const open = (id: string) => {
    onClose();
    router.push(`/people/${id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="relative max-h-[82%] overflow-y-auto rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div className="flex justify-center pb-1.5 pt-2.5">
          <div className="h-1 w-9 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 pb-3">
          <div>
            <div className="text-[15px] font-medium text-text">Training partners</div>
            <div className="mt-0.5 text-[11px] text-muted">
              {partners.length} different {partners.length === 1 ? "person" : "people"} so far
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

        {partners.length === 0 ? (
          <div className="px-6 py-12 text-center text-[12px] leading-relaxed text-muted">
            No training partners yet. Log a session and pick who you trained with —
            every new person you work out with shows up here.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border pb-6">
            {partners.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => open(p.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
              >
                <Avatar size={44} alt={p.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-text">{p.name}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">
                    {p.sessions} session{p.sessions === 1 ? "" : "s"} · last {lastLabel(p.lastDate)}
                  </span>
                </span>
                <IconChevronRight size={16} className="shrink-0 text-muted" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

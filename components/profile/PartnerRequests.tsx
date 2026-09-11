"use client";

/*
  "DID YOU TRAIN WITH SAM TODAY?" — the partner tag, asked of the partner.

  Somebody logged a session and named you. Until you answer, it counts for
  nobody. Yes confirms it for them AND logs the session for you (with them as
  your partner), so both of you score the partner points and both calendars
  show it. No leaves it as a solo session for them. Nothing is shown when
  there is nothing to answer.

  Sits at the top of the Profile tab, where the push for it lands. Colours are
  theme tokens; the window (24h) is data in lib/points.ts.
*/
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Avatar from "@/components/messages/Avatar";
import {
  activityLabel,
  listPartnerRequests,
  respondPartnerRequest,
  type PartnerRequest,
} from "@/lib/supabase/workouts";
import { sessionPoints } from "@/lib/points";

// "today" / "yesterday" / "Tue 9 Sep" — when the session they say you shared was.
function dayWord(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - t.getTime()) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  return t.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

export default function PartnerRequests({ onChanged }: { onChanged?: () => void }) {
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = () =>
      listPartnerRequests()
        .then((r) => active && setRequests(r))
        .catch(() => {});
    refresh();
    // A request arrives from someone else's phone; picking it up when the app
    // comes back to the foreground is what makes the push's "Yes" one tap.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (requests.length === 0) return null;

  const answer = async (r: PartnerRequest, accept: boolean) => {
    setBusyId(r.logId);
    setError(null);
    const res = await respondPartnerRequest(r.logId, accept);
    setBusyId(null);
    if (res.error) {
      // "expired" is the one honest failure: the window closed while the card sat here.
      setError(res.error.includes("expired") ? "Too late — that one has already counted as solo." : res.error);
      setRequests((cur) => cur.filter((x) => x.logId !== r.logId));
      return;
    }
    setRequests((cur) => cur.filter((x) => x.logId !== r.logId));
    onChanged?.();
  };

  return (
    <div className="border-b border-border px-3.5 py-3">
      <div className="flex flex-col gap-2">
        {requests.map((r) => (
          <div key={r.logId} className="rounded-2xl border border-primary bg-primary-tint px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <Avatar size={36} src={r.loggerPhoto} alt={r.loggerName} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-text">
                  Did you train with {r.loggerName} {dayWord(r.date)}?
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {activityLabel(r.activity)}
                  {r.gym ? ` at ${r.gym}` : ""} · Yes logs it for you too and you both get{" "}
                  {sessionPoints.partner}–{sessionPoints.newPartner} pts
                </div>
              </div>
            </div>
            <div className="mt-2.5 flex gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => answer(r, false)}
                disabled={busyId === r.logId}
                className="flex-1"
              >
                No
              </Button>
              <Button
                size="md"
                onClick={() => answer(r, true)}
                disabled={busyId === r.logId}
                className="flex-[2]"
              >
                {busyId === r.logId ? "…" : "Yes, we trained"}
              </Button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}
    </div>
  );
}

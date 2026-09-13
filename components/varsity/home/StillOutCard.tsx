"use client";

/*
  "STILL SICK?" — a card on Varsity Home for someone whose status has said
  Sick, Injured or Away for three days or more.

  A status with dates only works if somebody switches it back, and people
  forget. So after a few days Home asks: Still sick (the card goes away for
  today) or I'm back — which opens the profile, switches to Active and offers
  to log the days since into the calendar (lib/varsity/daysOut.ts). Shows
  nothing otherwise. Colors are theme tokens.
*/
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAthleteProfile } from "@/lib/varsity/athleteProfile";
import { dayOutDot, reasonMeta, spanLabel, statusReason, type DayOutReason } from "@/lib/varsity/daysOut";

const DAYS_BEFORE_ASKING = 3;

const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const daysSince = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - start.getTime()) / 86_400_000);
};
const askedKey = (userId: string) => `varsityStillOutAsked:${userId}:${isoToday()}`;

export default function StillOutCard({ userId }: { userId: string | null }) {
  const [spell, setSpell] = useState<{ reason: DayOutReason; since: string } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchAthleteProfile(userId).then(({ profile }) => {
      if (!active) return;
      const reason = statusReason(profile.status);
      if (!reason || !profile.statusSince || daysSince(profile.statusSince) < DAYS_BEFORE_ASKING) return;
      try {
        if (localStorage.getItem(askedKey(userId))) return;
      } catch {
        /* no storage: just ask */
      }
      setSpell({ reason, since: profile.statusSince });
    });
    return () => {
      active = false;
    };
  }, [userId]);

  if (!spell || !userId) return null;
  const meta = reasonMeta(spell.reason);
  const word = meta.label.toLowerCase();

  return (
    <div className="px-3 pt-3">
      <div className="rounded-xl border border-border bg-surface px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dayOutDot[meta.tone]}`} />
          <span className="text-[14px] font-semibold text-text">
            {spell.reason === "away" ? "Still away?" : `Still ${word}?`}
          </span>
          <span className="text-[12px] text-muted">since {spanLabel(spell.since, spell.since)}</span>
        </div>
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(askedKey(userId), "1");
              } catch {
                /* it will ask again, which is harmless */
              }
              setSpell(null);
            }}
            className="flex-1 rounded-xl border border-border bg-surface-2 py-2.5 text-[12px] font-medium text-text"
          >
            {spell.reason === "away" ? "Still away" : `Still ${word}`}
          </button>
          <Link
            href="/varsity/profile?back=1"
            className="flex flex-1 items-center justify-center rounded-xl bg-primary-live py-2.5 text-[12px] font-semibold text-primary-contrast"
          >
            I&apos;m back
          </Link>
        </div>
      </div>
    </div>
  );
}

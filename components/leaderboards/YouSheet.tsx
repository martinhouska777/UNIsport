"use client";

/*
  YOU, OPENED UP — what is behind the one line at the top of the boards.
  ---------------------------------------------------------------------------
  The header of the Rankings tab is deliberately one line: your points and
  where that puts you. Everything else about your own standing used to be
  either absent or spread over three screens, and the line looked like a
  label rather than something you could touch (owner, 2026-09-12: "the you
  should be clickable and there u will see more statistics etc and where are
  your friends").

  So the line is a button and this is underneath it. Three blocks, in the order
  somebody actually asks the questions:

    WHERE YOU STAND — your place among everybody, and your place among your
    own housemates, which are the two the database can honestly work out about
    YOU. Under them, where your house and your class year are placed on their
    own boards. Then the nearest person above you and what it would take to
    pass them, which is the only number on this screen that is a reason to
    train tonight.

    WHERE THE POINTS CAME FROM — your sessions split the three ways the whole
    scoring system is built on (alone, with a partner, with somebody new) and
    what each pile is worth. A score nobody can check is a score nobody
    trusts, and this is where yours is checkable.

    YOUR FRIENDS — the campus board cut down to the people you follow, with
    you in it. Four hundred names is a table; the eight people you know is a
    race, and it is the only board on this screen anybody will screenshot.
    Friends on nought are still listed: that is who you nudge.

  Nothing here is invented. Every number comes from the same two reads the
  boards behind this sheet use (db/leaderboards.sql); with nothing logged the
  sheet says so rather than showing a convincing zero.

  Colors are theme tokens (rule 1). The one exception is a person's house
  colour, which is DATA in lib/gyms.ts, applied inline.
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconTrophy, IconUser, IconX } from "@/components/icons";
import SectionLabel from "@/components/ui/SectionLabel";
import { pointsLabel, sessionPoints } from "@/lib/points";
import { classYearLabel, residenceLabel } from "@/lib/onboarding";
import {
  fetchPeopleBoard,
  groupLabel,
  houseColor,
  type LeaderRow,
  type Period,
  type Standing,
} from "@/lib/leaderboards";

const ordinal = (n: number): string => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

/* One rank, written the way people say it out loud: "4th" big, "of 26" under.
   A rank the database could not work out (you haven't logged anything, or you
   live off campus) says "—" rather than pretending to be first. */
function RankTile({
  label,
  rank,
  total,
}: {
  label: string;
  rank: number | null;
  total: number;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-2.5 py-2 text-center">
      <div className="truncate text-[9px] uppercase tracking-[0.1em] text-muted">{label}</div>
      <div className="mt-1 text-[17px] font-semibold leading-none text-text">
        {rank ? ordinal(rank) : "—"}
      </div>
      <div className="mt-1 text-[10px] text-muted">{rank ? `of ${total}` : "not yet"}</div>
    </div>
  );
}

/* One of the three kinds of session, with what it was worth. The row is only
   drawn when it happened — a line reading "0 × 25 = 0" is noise. */
function KindLine({
  label,
  count,
  each,
}: {
  label: string;
  count: number;
  each: number;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 py-1.5 text-[12px]">
      <span className="min-w-0 flex-1 truncate text-text">{label}</span>
      <span className="flex-shrink-0 text-[11px] text-muted">
        {count} × {each}
      </span>
      <span className="w-14 flex-shrink-0 text-right font-semibold tabular-nums text-text">
        {(count * each).toLocaleString("en-US")}
      </span>
    </div>
  );
}

/* A friend's row. Same shape as the boards behind the sheet, and tapping it
   goes the same place: their profile, or your own tab for your own row. */
function FriendRow({ row, onOpen }: { row: LeaderRow; onOpen: () => void }) {
  const tint = houseColor(row.residence);
  const detail =
    [
      row.residence ? residenceLabel(row.residence) : "",
      row.classYear ? classYearLabel(row.classYear) : "",
    ]
      .filter(Boolean)
      .join(" · ") || "—";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`tap44 flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left active:bg-surface-2 ${
        row.isMe ? "border-primary bg-primary-tint" : "border-border bg-surface"
      }`}
    >
      <span className="w-5 flex-shrink-0 text-center text-[11px] font-semibold tabular-nums text-muted">
        {row.rank}
      </span>
      <span
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary"
        style={tint ? { background: `${tint}26`, color: tint } : undefined}
      >
        <IconUser size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-text">
          {row.name}
          {row.isMe && <span className="ml-1.5 text-[11px] text-primary">You</span>}
        </div>
        <div className="truncate text-[11px] text-muted">{detail}</div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="text-[15px] font-semibold leading-none text-text">
          {row.score.toLocaleString("en-US")}
        </div>
        <div className="mt-1 text-[8px] uppercase tracking-[0.08em] text-muted">pts</div>
      </div>
    </button>
  );
}

export default function YouSheet({
  standing,
  period,
  periodLabel,
  onClose,
}: {
  /** Null while the header's own read is still in flight, or with no database. */
  standing: Standing | null;
  period: Period;
  /** "This month" — so the sheet says what window every number on it counts. */
  periodLabel: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [friends, setFriends] = useState<LeaderRow[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchPeopleBoard("friends", period, 100)
      // A failed read must still settle, or it says "Counting…" forever.
      .then((rows) => active && setFriends(rows))
      .catch(() => active && setFriends([]));
    return () => {
      active = false;
    };
  }, [period]);

  const kinds = standing?.kinds ?? { solo: 0, partner: 0, newPartner: 0 };
  const hasPoints = !!standing && standing.points > 0;
  // Your own row is always on the friends board, so a list of one is a list of
  // nobody: you are not following anybody who has an account yet.
  const others = (friends ?? []).filter((f) => !f.isMe);

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex h-dvh flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="sheet-floor relative flex max-h-[85%] flex-col rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div>
          <div className="flex justify-center pb-1.5 pt-2.5">
            <div className="h-1 w-9 rounded-full bg-border" />
          </div>

          <div className="flex items-start justify-between gap-3 border-b border-border px-4 pb-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent-tint text-accent">
                <IconTrophy size={16} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-medium text-text">You</div>
                <div className="mt-0.5 truncate text-[11px] text-muted">
                  {hasPoints ? pointsLabel(standing.points) : "0 pts"} ·{" "}
                  {periodLabel.toLowerCase()}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="tap44 press-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-3.5">
          {/* ── WHERE YOU STAND ──
              TWO TILES, NOT THREE. The database knows your place among
              everybody and your place among your own housemates, and those are
              two different sentences people actually say. It does NOT know
              "your rank in your class year" — the year number it returns is
              the year's own place on the years board, which belongs to the
              line underneath about your teams, not to a tile about you. */}
          <SectionLabel className="mb-2">Where you stand</SectionLabel>
          <div className="flex gap-1.5">
            <RankTile
              label="On campus"
              rank={standing?.campusRank ?? null}
              total={standing?.campusTotal ?? 0}
            />
            <RankTile
              label={standing?.residence ? `In ${residenceLabel(standing.residence)}` : "In your house"}
              rank={standing?.houseRankIn ?? null}
              total={standing?.houseActives ?? 0}
            />
          </div>

          {/* THE ONE NUMBER THAT IS A REASON TO TRAIN TONIGHT. "40 points and
              you pass Marcus" is a different sentence from "you are 7th". */}
          {standing?.nextName && standing.nextGap !== null && (
            <div className="mt-2 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-[12px] leading-relaxed text-muted">
              <span className="font-semibold text-text">{standing.nextGap} pts</span> behind{" "}
              <span className="text-text">{standing.nextName}</span>
              {standing.nextScope === "house" && standing.residence
                ? ` in ${residenceLabel(standing.residence)}`
                : " on campus"}
              .
            </div>
          )}

          {/* YOUR TEAMS — where the two groups you belong to are placed on
              their own boards. A different question from the tiles above (that
              is you; this is everyone you are counted with), and the one people
              actually argue about at dinner. Each half is drawn only when the
              database could work it out. */}
          {(standing?.houseRank || standing?.yearRank) && (
            <div className="mt-2 text-[11px] leading-relaxed text-muted">
              {[
                standing.residence && standing.houseRank
                  ? `${residenceLabel(standing.residence)} is ${ordinal(standing.houseRank)} of ${standing.houseTotal}`
                  : "",
                standing.classYear && standing.yearRank
                  // "Class of '27", not "Sr" — this half is about the year as a
                  // TEAM on the years board, and that is the name the board
                  // itself writes on it.
                  ? `${groupLabel("year", standing.classYear)} is ${ordinal(standing.yearRank)} of ${standing.yearTotal}`
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}

          {/* ── WHERE THE POINTS CAME FROM ── */}
          <SectionLabel className="mb-2 mt-5">Where your points came from</SectionLabel>
          {hasPoints ? (
            <div className="rounded-2xl border border-border bg-surface px-3.5 py-1.5">
              <KindLine label="Trained alone" count={kinds.solo} each={sessionPoints.solo} />
              <KindLine
                label="With a partner"
                count={kinds.partner}
                each={sessionPoints.partner}
              />
              <KindLine
                label="With someone new"
                count={kinds.newPartner}
                each={sessionPoints.newPartner}
              />
              <div className="flex items-center gap-2 border-t border-border py-2 text-[12px]">
                <span className="min-w-0 flex-1 truncate font-medium text-text">
                  {plural(standing.sessions, "session")}
                </span>
                <span className="w-14 flex-shrink-0 text-right text-[15px] font-semibold tabular-nums text-text">
                  {standing.points.toLocaleString("en-US")}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] text-muted">
              Nothing logged {periodLabel.toLowerCase()}. One session puts you on the board.
            </div>
          )}
          {standing && standing.partners > 0 && (
            <div className="mt-2 text-[11px] leading-relaxed text-muted">
              Trained with {standing.partners}{" "}
              {standing.partners === 1 ? "different person" : "different people"} — a
              session with somebody new is worth {sessionPoints.newPartner}.
            </div>
          )}

          {/* ── YOUR FRIENDS ── */}
          <SectionLabel className="mb-2 mt-5">Your friends</SectionLabel>
          {friends === null ? (
            <div className="px-4 py-8 text-center text-[12px] text-muted">Counting…</div>
          ) : others.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-[12px] leading-relaxed text-muted">
              You&rsquo;re not following anyone yet. Follow people from the Match tab and
              this becomes your own small leaderboard.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {friends.map((f) => (
                <FriendRow
                  key={f.userId}
                  row={f}
                  onOpen={() => router.push(f.isMe ? "/profile" : `/people/${f.userId}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

/*
  YOU, OPENED UP — what is behind the one line at the top of the boards.
  ---------------------------------------------------------------------------
  The header of the Rankings tab is deliberately one line: your points and
  where that puts you. Tapping it opens this (owner, 2026-09-12: "the you
  should be clickable and there u will see more statistics etc and where are
  your friends").

  A WHOLE SCREEN, NOT A SHEET (owner, 2026-09-15). It used to rise from the
  bottom with a grey grab-line on top "that doesn't do anything"; now it is a
  page of its own with a back arrow, like a workout's detail. The header is
  YOU — your own photo, not a trophy.

  Three blocks, in the order somebody actually asks the questions:

    WHERE YOU STAND — two coloured tiles: your place on campus (the school's
    colour) and your place in your own house (the house's colour). The
    "40 pts behind …" nudge and the "your house is 3rd of 5 · your class is
    2nd of 4" line under them were cut the same day.

    WHERE THE POINTS CAME FROM — your sessions split the three ways the whole
    scoring system is built on (alone, with a partner, with somebody new) and
    what each pile is worth. A score nobody can check is a score nobody trusts.

    YOUR FRIENDS — the campus board cut down to the people you follow, with
    you in it; the top three wear a medal, like every other board.

  Nothing here is invented. Every number comes from the same two reads the
  boards behind this screen use (db/leaderboards.sql).

  Colors are theme tokens (rule 1). The one exception is a house's colours,
  which are DATA in lib/gyms.ts / lib/cohorts.ts, applied inline.
*/
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconUser, HouseShield } from "@/components/icons";
import UniversityCrest from "@/components/UniversityCrest";
import Medal from "@/components/leaderboards/Medal";
import SectionLabel from "@/components/ui/SectionLabel";
import { pointsLabel, sessionPoints } from "@/lib/points";
import { classYearLabel, residenceLabel } from "@/lib/onboarding";
import {
  fetchPeopleBoard,
  houseColor,
  houseCrest,
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
   A rank the database could not work out says "—" rather than pretending to
   be first. The tile wears a colour: the campus one the school's, the house
   one its house's (passed in as `wash`, content data applied inline). */
function RankTile({
  label,
  icon,
  rank,
  total,
  wash,
}: {
  label: string;
  icon: ReactNode;
  rank: number | null;
  total: number;
  /** A house's own colour. Without one the tile takes the school's. */
  wash?: string | null;
}) {
  return (
    <div
      className="min-w-0 flex-1 rounded-2xl border border-primary/30 bg-primary-tint px-2.5 py-3 text-center"
      style={wash ? { background: `${wash}1f`, borderColor: `${wash}66` } : undefined}
    >
      <div className="flex justify-center">{icon}</div>
      <div className="mt-1.5 truncate text-[9px] uppercase tracking-[0.1em] text-muted">{label}</div>
      <div className="mt-1 text-[22px] font-semibold leading-none text-text">
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

/* A friend's row. Same shape as the boards, and tapping it goes the same
   place: their profile, or your own tab for your own row. First to third wear
   a medal (owner, 2026-09-15), everyone below a plain number. */
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
      {row.rank <= 3 ? (
        <Medal place={row.rank as 1 | 2 | 3} rank={row.rank} size={28} />
      ) : (
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[11px] font-semibold text-muted">
          {row.rank}
        </span>
      )}
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

export default function YouScreen({
  standing,
  period,
  periodLabel,
  photo,
  onBack,
}: {
  /** Null while the header's own read is still in flight, or with no database. */
  standing: Standing | null;
  period: Period;
  /** "This month" — so the screen says what window every number on it counts. */
  periodLabel: string;
  /** Your own profile photo, or "" for none. */
  photo: string;
  onBack: () => void;
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
  const crest = houseCrest(standing?.residence);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background [animation:backdrop-in_0.2s_ease-out]">
      <div className="flex items-center gap-2.5 border-b border-border bg-surface px-3.5 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-text"
        >
          <IconArrowLeft size={16} />
        </button>
        {/* YOU, as you: your own photo in a ring of the school colour. */}
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primary-tint text-primary">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            <IconUser size={18} />
          )}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base font-medium text-text">You</h1>
          <div className="truncate text-[11px] text-muted">
            {hasPoints ? pointsLabel(standing.points) : "0 pts"} · {periodLabel.toLowerCase()}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-4">
        <div className="mx-auto w-full max-w-screen-sm">
          {/* ── WHERE YOU STAND ── */}
          <SectionLabel className="mb-2">Where you stand</SectionLabel>
          <div className="flex gap-2">
            <RankTile
              label="On campus"
              /* The school's own shield, not a trophy in a red circle — the
                 same crest the Profile strip uses (owner, 2026-09-15). */
              icon={<UniversityCrest size={28} />}
              rank={standing?.campusRank ?? null}
              total={standing?.campusTotal ?? 0}
            />
            <RankTile
              label={standing?.residence ? `In ${residenceLabel(standing.residence)}` : "In your house"}
              icon={
                crest ? (
                  <HouseShield primary={crest.primary} secondary={crest.secondary} size={28} />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-background">
                    <IconUser size={14} />
                  </span>
                )
              }
              rank={standing?.houseRankIn ?? null}
              total={standing?.houseActives ?? 0}
              wash={crest?.primary}
            />
          </div>

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

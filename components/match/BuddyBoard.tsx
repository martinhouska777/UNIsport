"use client";

/*
  GYM BUDDY BOARD — Match tab → Buddy Board sub-tab.

  The honest answer to "find someone to do legs Thursday afternoon": you POST
  what you want to train + a day + a coarse time-of-day, and you see everyone
  else's open posts and Message them. Posts are for the coming week and expire
  once the day passes (handled in db/buddy_board.sql).

  All data comes from the SECURITY DEFINER RPCs via lib/supabase/buddyBoard.ts.
  Colors are theme tokens only; the option lists come from lib/buddyBoard.ts.
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBuddyPost,
  listBuddyBoard,
  listMyBuddyPosts,
  deleteBuddyPost,
  type BuddyPost,
  type MyBuddyPost,
} from "@/lib/supabase/buddyBoard";
import { startDirectConversation } from "@/lib/supabase/messages";
import { buddyFocuses, buddyTimesOfDay, focusLabel, timeOfDayLabel } from "@/lib/buddyBoard";
import { weekDays, verifiedGyms } from "@/lib/onboarding";
import { Pill, FieldLabel } from "@/components/onboarding/controls";
import Avatar from "@/components/messages/Avatar";

function dayShort(key: string): string {
  return weekDays.find((d) => d.key === key)?.label.slice(0, 3) ?? key;
}

// One line summarising a post: "Legs · Thu · Afternoon".
function summary(focus: string, day: string, timeOfDay: string): string {
  return `${focusLabel(focus)} · ${dayShort(day)} · ${timeOfDayLabel(timeOfDay)}`;
}

function Status({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-12 text-center text-sm text-muted">{children}</div>;
}

export default function BuddyBoard() {
  const router = useRouter();

  // --- Post form state ---
  const [focus, setFocus] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<string | null>(null);
  const [gym, setGym] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  // --- Board + my posts ---
  const [board, setBoard] = useState<BuddyPost[] | null>(null);
  const [mine, setMine] = useState<MyBuddyPost[] | null>(null);
  const [boardErr, setBoardErr] = useState<string | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  // --- Optional board filters ---
  const [filterFocus, setFilterFocus] = useState<string | null>(null);
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [filterTime, setFilterTime] = useState<string | null>(null);

  const load = async () => {
    setBoardErr(null);
    try {
      const [b, m] = await Promise.all([
        listBuddyBoard({ focus: filterFocus, day: filterDay, timeOfDay: filterTime }),
        listMyBuddyPosts(),
      ]);
      setBoard(b);
      setMine(m);
    } catch (e) {
      setBoardErr((e as Error).message);
    }
  };

  // Reload the board whenever a filter changes (and on first mount).
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterFocus, filterDay, filterTime]);

  const canPost = !!focus && !!day && !!timeOfDay && !posting;

  const submit = async () => {
    if (!canPost) return;
    setPosting(true);
    setFormErr(null);
    try {
      await createBuddyPost({ focus: focus!, day: day!, timeOfDay: timeOfDay!, gym, note });
      // reset the form, keep filters; refresh both lists
      setFocus(null);
      setDay(null);
      setTimeOfDay(null);
      setGym(null);
      setNote("");
      await load();
    } catch (e) {
      setFormErr((e as Error).message);
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteBuddyPost(id);
      await load();
    } catch (e) {
      setBoardErr((e as Error).message);
    }
  };

  const message = async (post: BuddyPost) => {
    setMessagingId(post.id);
    try {
      const convId = await startDirectConversation(post.author);
      router.push(`/messages?dm=${convId}&name=${encodeURIComponent(post.authorName)}`);
    } catch (e) {
      setBoardErr((e as Error).message);
      setMessagingId(null);
    }
  };

  const anyFilter = filterFocus || filterDay || filterTime;

  return (
    <div className="px-3 pb-4">
      {/* POST FORM */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3.5">
        <div className="text-sm font-medium text-text">Post what you want to train</div>

        <div>
          <FieldLabel>Focus</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {buddyFocuses.map((f) => (
              <Pill key={f.key} label={f.label} selected={focus === f.key} onClick={() => setFocus(f.key)} />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Day</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {weekDays.map((d) => (
              <Pill
                key={d.key}
                label={d.label.slice(0, 3)}
                selected={day === d.key}
                onClick={() => setDay(d.key)}
              />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Time of day</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {buddyTimesOfDay.map((t) => (
              <Pill
                key={t.key}
                label={t.label}
                selected={timeOfDay === t.key}
                onClick={() => setTimeOfDay(t.key)}
              />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Gym (optional)</FieldLabel>
          <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-1">
            {verifiedGyms.map((g) => (
              <div key={g} className="flex-shrink-0">
                <Pill label={g} selected={gym === g} onClick={() => setGym(gym === g ? null : g)} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Note (optional)</FieldLabel>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. easy session, happy to spot"
            maxLength={120}
            // 16px text avoids mobile auto-zoom on focus.
            className="w-full rounded-[10px] border border-border bg-surface px-3.5 py-3 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!canPost}
          className="rounded-xl bg-primary py-3 text-center text-[13px] font-medium text-primary-contrast disabled:opacity-40"
        >
          {posting ? "Posting…" : "Post to board"}
        </button>
        {!focus || !day || !timeOfDay ? (
          <p className="text-center text-[11px] text-muted">Pick a focus, day, and time of day.</p>
        ) : null}
        {formErr && <p className="text-center text-[11px] text-danger">Couldn’t post: {formErr}</p>}
      </div>

      {/* YOUR POSTS */}
      {mine && mine.length > 0 && (
        <div className="pt-4">
          <div className="pb-1.5 text-[10px] tracking-[0.06em] text-muted">YOUR POSTS</div>
          <div className="flex flex-col gap-2">
            {mine.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-text">{summary(m.focus, m.day, m.timeOfDay)}</div>
                  {(m.gym || m.note) && (
                    <div className="truncate text-[11px] text-muted">
                      {[m.gym, m.note].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  className="rounded-full border border-border px-3 py-1.5 text-[12px] text-muted"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOARD FILTERS */}
      <div className="pt-5">
        <div className="flex items-center justify-between pb-2">
          <div className="text-[10px] tracking-[0.06em] text-muted">OPEN POSTS</div>
          {anyFilter && (
            <button
              type="button"
              onClick={() => {
                setFilterFocus(null);
                setFilterDay(null);
                setFilterTime(null);
              }}
              className="text-[11px] text-primary"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3">
          <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5">
            {buddyFocuses.map((f) => (
              <div key={f.key} className="flex-shrink-0">
                <Pill
                  label={f.label}
                  selected={filterFocus === f.key}
                  onClick={() => setFilterFocus(filterFocus === f.key ? null : f.key)}
                />
              </div>
            ))}
          </div>
          <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5">
            {weekDays.map((d) => (
              <div key={d.key} className="flex-shrink-0">
                <Pill
                  label={d.label.slice(0, 3)}
                  selected={filterDay === d.key}
                  onClick={() => setFilterDay(filterDay === d.key ? null : d.key)}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            {buddyTimesOfDay.map((t) => (
              <Pill
                key={t.key}
                label={t.label}
                selected={filterTime === t.key}
                onClick={() => setFilterTime(filterTime === t.key ? null : t.key)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* BOARD LIST */}
      {boardErr && <Status>Couldn’t load the board: {boardErr}</Status>}
      {!boardErr && board === null && <Status>Loading the board…</Status>}
      {!boardErr && board && board.length === 0 && (
        <Status>
          {anyFilter
            ? "No posts match those filters yet."
            : "No open posts yet. Post above and check back as more people join."}
        </Status>
      )}
      {!boardErr && board && board.length > 0 && (
        <div className="flex flex-col gap-2 pt-3">
          {board.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3"
            >
              <Avatar size={44} src={p.authorPhoto} alt={p.authorName} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text">{p.authorName}</div>
                <div className="text-[13px] text-text">{summary(p.focus, p.day, p.timeOfDay)}</div>
                {(p.gym || p.note) && (
                  <div className="truncate text-[11px] text-muted">
                    {[p.gym, p.note].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => message(p)}
                disabled={messagingId === p.id}
                className="flex-shrink-0 rounded-full bg-primary px-4 py-2 text-[12px] font-medium text-primary-contrast disabled:opacity-40"
              >
                {messagingId === p.id ? "…" : "Message"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

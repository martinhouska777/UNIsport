"use client";

/*
  GYM BUDDY BOARD — the default view of Match → Sessions.

  The honest answer to "find someone to do legs Thursday afternoon": you POST
  what you want to train + a day + a coarse time-of-day, and you see everyone
  else's open posts and Message them. Posts are for the coming week and expire
  once the day passes (handled in db/buddy_board.sql).

  All data comes from the SECURITY DEFINER RPCs via lib/supabase/buddyBoard.ts.
  Colors are theme tokens only; the option lists come from lib/buddyBoard.ts.
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/Skeleton";
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
import FilterBar from "@/components/match/FilterBar";
import BoardFiltersSheet, {
  NO_BOARD_FILTERS,
  boardFilterCount,
  boardFilterChips,
  type BoardFilters,
} from "@/components/match/BoardFiltersSheet";
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
  /*
    The form used to BE this screen — five rows of chips you had to scroll past
    to reach anybody else's post. The posts are what you come here for, so the
    form waits behind the button and the board is what you land on.
  */
  const [composing, setComposing] = useState(false);

  // --- Board + my posts ---
  const [board, setBoard] = useState<BuddyPost[] | null>(null);
  const [mine, setMine] = useState<MyBuddyPost[] | null>(null);
  const [boardErr, setBoardErr] = useState<string | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  // --- Optional board filters (behind the Filters button, not a second form) ---
  const [filters, setFilters] = useState<BoardFilters>(NO_BOARD_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Nothing is set before the first await on purpose: a setState in the
  // synchronous part of an effect body cascades a render (react-hooks/
  // set-state-in-effect), and the error only needs clearing once new rows land.
  const load = async () => {
    try {
      const [b, m] = await Promise.all([
        listBuddyBoard({
          focus: filters.focus,
          day: filters.day,
          timeOfDay: filters.timeOfDay,
        }),
        listMyBuddyPosts(),
      ]);
      setBoard(b);
      setMine(m);
      setBoardErr(null);
    } catch (e) {
      setBoardErr((e as Error).message);
    }
  };

  // Reload the board whenever a filter changes (and on first mount).
  useEffect(() => {
    // Fetching on a filter change IS synchronising with an external system;
    // every setState inside load() happens after an await, in a callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

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
      setComposing(false);
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
      // `uid` matters: without it the thread header has no photo and the name
      // isn't tappable through to their profile.
      router.push(
        `/messages?dm=${convId}&name=${encodeURIComponent(post.authorName)}&uid=${encodeURIComponent(post.author)}`,
      );
    } catch (e) {
      setBoardErr((e as Error).message);
      setMessagingId(null);
    }
  };

  const anyFilter = boardFilterCount(filters) > 0;

  return (
    <div className="px-3 pb-4">
      {/* POST — a button until you want it, then the form in its place. */}
      {!composing ? (
        <Button size="lg" full onClick={() => setComposing(true)}>
          + Post what you want to train
        </Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3.5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-text">Post what you want to train</div>
            <button
              type="button"
              onClick={() => setComposing(false)}
              className="tap44 rounded-full border border-border px-3 py-1.5 text-[12px] text-muted"
            >
              Cancel
            </button>
          </div>

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
            <div className="-mx-0.5 chip-row flex gap-1.5 overflow-x-auto px-0.5 pb-1">
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

          <Button size="lg" full onClick={submit} disabled={!canPost}>
            {posting ? "Posting…" : "Post to board"}
          </Button>
          {!focus || !day || !timeOfDay ? (
            <p className="text-center text-[11px] text-muted">Pick a focus, day, and time of day.</p>
          ) : null}
          {formErr && <p className="text-center text-[11px] text-danger">Couldn’t post: {formErr}</p>}
        </div>
      )}

      {/* YOUR POSTS */}
      {mine && mine.length > 0 && (
        <div className="pt-4">
          <div className="pb-1.5 text-[11px] tracking-[0.06em] text-muted">YOUR POSTS</div>
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
                  className="tap44 rounded-full border border-border px-3 py-1.5 text-[12px] text-muted"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOARD — heading + the Filters button. The filters used to be three
          rows of pills identical to the three in the form above, which read as
          the same form repeated; they now live in a sheet (#7 in the audit). */}
      <div className="pt-5">
        <div className="pb-2 text-[11px] tracking-[0.06em] text-muted">OPEN POSTS</div>
        <FilterBar
          count={boardFilterCount(filters)}
          chips={boardFilterChips(filters)}
          onOpen={() => setSheetOpen(true)}
          onClear={(key) => setFilters({ ...filters, [key]: null })}
        />
      </div>

      {/* BOARD LIST */}
      {boardErr && <Status>Couldn’t load the board: {boardErr}</Status>}
      {!boardErr && board === null && <SkeletonRows count={4} />}
      {!boardErr && board && board.length === 0 && (
        <Status>
          {anyFilter
            ? "No posts match those filters yet."
            : "No open posts yet. Put yours up with the button above and check back as more people join."}
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
              <Button
                size="sm"
                onClick={() => message(p)}
                disabled={messagingId === p.id}
                className="flex-shrink-0"
              >
                {messagingId === p.id ? "…" : "Message"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {sheetOpen && (
        <BoardFiltersSheet
          value={filters}
          onChange={setFilters}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}

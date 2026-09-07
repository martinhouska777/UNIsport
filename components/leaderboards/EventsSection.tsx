"use client";

/*
  EVENTS — the week's two races.
  ---------------------------------------------------------------------------
  Everything else in the League only goes forwards. This is the part that ENDS:
  it starts on Monday, it is gone on Sunday night, and it has a winner. That is
  the reason to open the app on a Monday, and the reason a quiet week still has
  something in it.

  YOURS runs whatever happens — it works when you are the only person here,
  which at launch you are.

  YOUR HOUSE'S is a race between houses, and it is GATED BY HOUSE LEVEL. A
  house that hasn't built anything yet can see the race, can see exactly how far
  off the door is, and can see what its own level is — it just cannot enter. The
  gap is the recruiting pitch: "three more people logging and we're in".

  Which two events run is decided by the week number (lib/events.ts), so the
  whole campus sees the same pair and nobody has to schedule anything.
*/
import { Bar, Empty, Loading, RankBadge } from "@/components/leaderboards/pieces";
import { residenceLabel } from "@/lib/onboarding";
import { houseColor } from "@/lib/leaderboards";
import { houseLevelProgress } from "@/lib/xp";
import {
  daysLeftLabel,
  eventProgress,
  eventsThisWeek,
  houseCanEnter,
  HOUSE_EVENT_MIN_LEVEL,
  type EventCounters,
  type WeeklyEvent,
} from "@/lib/events";
import type { HouseWeek } from "@/lib/league";

function Header({ kind }: { kind: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{kind}</h2>
      <span className="flex-shrink-0 text-[11px] font-medium text-accent">{daysLeftLabel()}</span>
    </div>
  );
}

/** The big card at the top of each half: what it is, how far, what it pays. */
function EventCard({
  event,
  have,
  target,
  done,
  fraction,
  tint,
}: {
  event: WeeklyEvent;
  have: number;
  target: number;
  done: boolean;
  fraction: number;
  tint?: string | null;
}) {
  return (
    <div
      className={`mt-2 rounded-2xl border px-3.5 py-3 ${
        done ? "border-success-line bg-success-tint" : "border-border bg-surface-2"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[15px] font-semibold text-text">{event.title}</span>
        <span className="flex-shrink-0 text-[11px] font-semibold text-primary">
          +{event.xp.toLocaleString()} XP
        </span>
      </div>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{event.blurb}</p>
      <Bar fraction={fraction} tint={tint} />
      <div className="mt-1.5 text-[11px] font-medium text-text">
        {done
          ? "Done — the XP is yours."
          : `${have.toLocaleString()} of ${target.toLocaleString()}`}
      </div>
    </div>
  );
}

/* ─────────────────────────────  screen  ───────────────────────────── */

export default function EventsSection({
  mine,
  houses,
  residence,
}: {
  mine: EventCounters | null;
  houses: HouseWeek[] | null;
  residence: string | null;
}) {
  if (!mine || !houses) return <Loading />;

  const { personal, house } = eventsThisWeek();
  const my = eventProgress(personal, mine);

  const myHouse = houses.find((h) => h.key === residence) ?? null;
  const canEnter = myHouse ? houseCanEnter(myHouse.xp) : false;
  const myHouseLevel = myHouse ? houseLevelProgress(myHouse.xp).level : 1;

  // Only houses through the gate are in the race, and they are ranked among
  // themselves — a house that cannot enter is not "last", it is not running.
  const entered = houses
    .filter((h) => h.kind === "house" && houseCanEnter(h.xp))
    .map((h) => ({ h, p: eventProgress(house, h.counters) }))
    .sort((a, b) => b.p.fraction - a.p.fraction || a.h.key.localeCompare(b.h.key));

  return (
    <div className="px-3.5 py-3">
      {/* ── Yours ─────────────────────────────────────────────────── */}
      <Header kind="Your event this week" />
      <EventCard
        event={personal}
        have={my.have}
        target={my.target}
        done={my.done}
        fraction={my.fraction}
      />

      {/* ── The house race ────────────────────────────────────────── */}
      <div className="mt-5">
        <Header kind="The house race" />

        {!residence ? (
          <Empty>
            You haven&rsquo;t told us where you live yet, so there is no house to race with.
          </Empty>
        ) : !canEnter ? (
          <>
            <div className="mt-2 rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
              <div className="text-[15px] font-semibold text-text">
                {residenceLabel(residence)} isn&rsquo;t in yet
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                A house enters the weekly race at{" "}
                <strong className="font-semibold text-text">Level {HOUSE_EVENT_MIN_LEVEL}</strong>.
                Yours is Level {myHouseLevel}. Every session anyone here logs moves it — and so
                does every person you get to start logging.
              </p>
              <Bar
                fraction={Math.min(1, myHouseLevel / HOUSE_EVENT_MIN_LEVEL)}
                tint={houseColor(residence)}
              />
            </div>
            <p className="mt-2 px-0.5 text-[11px] leading-relaxed text-muted">
              This week&rsquo;s race is <strong className="text-text">{house.title}</strong> —{" "}
              {house.blurb.toLowerCase()} You can watch it below.
            </p>
          </>
        ) : (
          myHouse && (
            // eventProgress carries the event itself, so spreading it is the
            // whole card — passing `event` as well would just shadow it.
            <EventCard {...eventProgress(house, myHouse.counters)} tint={houseColor(residence)} />
          )
        )}

        {/* Everyone in the race, whether or not you are. */}
        <div className="mt-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {entered.length ? `${entered.length} houses racing` : "The race"}
          </h3>
          {entered.length === 0 ? (
            <Empty>
              No house has reached Level {HOUSE_EVENT_MIN_LEVEL} yet, so nobody is racing. The
              first one there starts it.
            </Empty>
          ) : (
            <div className="mt-2 flex flex-col gap-1.5">
              {entered.map(({ h, p }, i) => (
                <div
                  key={h.key}
                  className={`rounded-xl border px-3 py-2.5 ${
                    h.isMine ? "border-primary bg-primary-tint" : "border-border bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <RankBadge rank={i + 1} />
                    <span
                      className="h-8 w-1.5 flex-shrink-0 rounded-full bg-primary"
                      style={
                        houseColor(h.key) ? { background: houseColor(h.key)! } : undefined
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-text">
                        {residenceLabel(h.key)}
                        {h.isMine && <span className="ml-1.5 text-[11px] text-primary">Yours</span>}
                      </div>
                      <div className="truncate text-[11px] text-muted">
                        {p.done ? "Across the line" : `${p.have.toLocaleString()} of ${p.target.toLocaleString()}`}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-[15px] font-semibold text-text">
                      {Math.round(p.fraction * 100)}%
                    </span>
                  </div>
                  <Bar fraction={p.fraction} tint={houseColor(h.key)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 px-0.5 text-[11px] leading-relaxed text-muted">
        Events run Monday to Sunday and change on their own every week. Your own event always
        runs; the house race needs the house at Level {HOUSE_EVENT_MIN_LEVEL}.
      </p>
    </div>
  );
}

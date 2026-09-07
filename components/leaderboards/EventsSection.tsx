"use client";

/*
  EVENTS — the things with a deadline.
  ---------------------------------------------------------------------------
  Everything else in the League only goes forwards. This is the part that ENDS.

  SPECIAL EVENTS are the Strava-style ones: three running at once, one closing
  on Sunday and two with the month, each worth a chunk of bonus XP. They are
  deliberately not the daily/weekly/monthly habit challenges on the Challenges
  tab — those are the steady drumbeat. These ask for something you would not
  otherwise have done: go somewhere new, run further, meet people, turn up five
  days out of seven.

  THE HOUSE RACE is one event every house runs at the same time, ranked against
  each other while the bars fill, and it is GATED BY HOUSE LEVEL. A house below
  the gate can see the race, can see its own level, and can see exactly how far
  off the door is — the gap is the recruiting pitch.

  Which events run is decided by the week and month number (lib/events.ts), so
  the whole campus sees the same ones and nobody schedules anything.
*/
import { Bar, Empty, Loading, RankBadge } from "@/components/leaderboards/pieces";
import { residenceLabel } from "@/lib/onboarding";
import { houseColor } from "@/lib/leaderboards";
import { houseLevelProgress } from "@/lib/xp";
import {
  eventProgress,
  houseCanEnter,
  houseEventThisWeek,
  specialEventsNow,
  windowLeftLabel,
  HOUSE_EVENT_MIN_LEVEL,
  type EventCounters,
  type EventProgress,
  type SpecialEvent,
} from "@/lib/events";
import type { HouseWeek } from "@/lib/league";

function SectionHead({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</h2>
      {note && <span className="flex-shrink-0 text-[11px] font-medium text-accent">{note}</span>}
    </div>
  );
}

/** One special event: what it is, how far you are, what it pays, when it ends. */
function SpecialCard({ event, p }: { event: SpecialEvent; p: EventProgress }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        p.done ? "border-success-line bg-success-tint" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[13px] font-medium text-text">{event.title}</span>
        <span className="flex-shrink-0 text-[11px] font-semibold text-primary">
          +{event.xp.toLocaleString()} XP
        </span>
      </div>
      <p className="mt-0.5 truncate text-[11px] text-muted">{event.blurb}</p>
      <Bar fraction={p.fraction} />
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium text-text">
          {p.done ? "Done — the XP is yours." : `${p.have.toLocaleString()} of ${p.target.toLocaleString()}`}
        </span>
        <span className="flex-shrink-0 text-[11px] text-muted">
          {windowLeftLabel(event.window)}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────  screen  ───────────────────────────── */

export default function EventsSection({
  week,
  month,
  houses,
  residence,
}: {
  week: EventCounters | null;
  month: EventCounters | null;
  houses: HouseWeek[] | null;
  residence: string | null;
}) {
  if (!week || !month || !houses) return <Loading />;

  const specials = specialEventsNow();
  const house = houseEventThisWeek();

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
      {/* ── Special events ────────────────────────────────────────── */}
      <SectionHead title="Special events" />
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        Bonus XP for something out of the ordinary. Three at a time — one ends on Sunday, two end
        with the month.
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {specials.map((e) => (
          <SpecialCard
            key={e.key}
            event={e}
            p={eventProgress(e, e.window === "week" ? week : month)}
          />
        ))}
      </div>

      {/* ── The house race ────────────────────────────────────────── */}
      <div className="mt-5">
        <SectionHead title="House competition" note={windowLeftLabel("week")} />
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          One target, every house pushing at once, and a new one every Monday. This week:{" "}
          <strong className="text-text">{house.title}</strong> — {house.blurb.toLowerCase()}
        </p>

        {!residence ? (
          <Empty>
            You haven&rsquo;t told us where you live yet, so there is no house to race with.
          </Empty>
        ) : !canEnter ? (
          <div className="mt-2 rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
            <div className="text-[15px] font-semibold text-text">
              {residenceLabel(residence)} isn&rsquo;t in yet
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              A house enters at{" "}
              <strong className="font-semibold text-text">Level {HOUSE_EVENT_MIN_LEVEL}</strong>.
              Yours is Level {myHouseLevel}. Every session anyone here logs moves it — and so does
              every person you get to start logging.
            </p>
            <Bar
              fraction={Math.min(1, myHouseLevel / HOUSE_EVENT_MIN_LEVEL)}
              tint={houseColor(residence)}
            />
          </div>
        ) : (
          myHouse && (
            <div className="mt-2 rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[15px] font-semibold text-text">
                  {residenceLabel(residence)}
                </span>
                <span className="flex-shrink-0 text-[11px] font-semibold text-primary">
                  +{house.xp.toLocaleString()} XP to the house
                </span>
              </div>
              {(() => {
                const p = eventProgress(house, myHouse.counters);
                return (
                  <>
                    <Bar fraction={p.fraction} tint={houseColor(residence)} />
                    <div className="mt-1.5 text-[11px] font-medium text-text">
                      {p.done
                        ? "Across the line."
                        : `${p.have.toLocaleString()} of ${p.target.toLocaleString()}`}
                    </div>
                  </>
                );
              })()}
            </div>
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
                      style={houseColor(h.key) ? { background: houseColor(h.key)! } : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-text">
                        {residenceLabel(h.key)}
                        {h.isMine && <span className="ml-1.5 text-[11px] text-primary">Yours</span>}
                      </div>
                      <div className="truncate text-[11px] text-muted">
                        {p.done
                          ? "Across the line"
                          : `${p.have.toLocaleString()} of ${p.target.toLocaleString()}`}
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
    </div>
  );
}

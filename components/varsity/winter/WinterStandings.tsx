"use client";

/*
  WINTER POINTS, THE STANDINGS — opened from the athlete's Profile (owner,
  2026-11-08, look A). Teams, People and Classes, week by week or the total.
  A team or a class opens its people, a person opens their week day by day,
  and the i in the corner opens the points, the limits and the rules and prizes.
  Everything is counted from the sessions the team logged
  (lib/varsity/winterPoints.ts).
*/
import { useState } from "react";
import Link from "next/link";
import Segmented from "@/components/ui/Segmented";
import Sheet from "@/components/varsity/Sheet";
import { Group, Row } from "@/components/settings/SettingsShell";
import { IconArrowLeft, IconChevronRight, IconInfo } from "@/components/icons";
import { useAppState } from "@/components/AppState";
import { useMembership } from "@/components/varsity/useMembership";
import { useWinterConfig, useWinterStandings } from "@/components/varsity/winter/useWinter";
import WinterDayCard, { Dot } from "@/components/varsity/winter/WinterDayCard";
import {
  activityDetail,
  activityRules,
  classOrder,
  classValue,
  eventPeople,
  fmtNum,
  fmtPoints,
  limitDetail,
  limitKeys,
  limitSpec,
  nWeeks,
  personValue,
  personWeek,
  teamOf,
  teamValue,
  wpRankColors,
  type WeekPick,
  type WinterPoints,
} from "@/lib/varsity/winterPoints";

type Tab = "teams" | "people" | "classes";
type Open = { k: "team"; id: string } | { k: "class"; id: string } | { k: "person"; id: string } | { k: "rules" };

function Rank({ n, value }: { n: number; value: number }) {
  const medal = n <= 3 && value > 0 ? wpRankColors[n - 1] : undefined;
  return (
    <span
      className={`inline-flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums text-text ${
        medal ? "" : "bg-surface-2"
      }`}
      style={medal ? { background: medal } : undefined}
    >
      {n}
    </span>
  );
}

function StandRow({
  rank,
  dot,
  label,
  value,
  you,
  extra,
  onClick,
  chevron,
}: {
  rank?: number;
  dot?: string;
  label: string;
  value: number;
  you?: boolean;
  extra?: React.ReactNode;
  onClick: () => void;
  chevron?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[50px] w-full items-center gap-2.5 px-4 py-2 text-left active:bg-surface-2 ${
        you ? "bg-primary-tint" : ""
      }`}
    >
      {rank != null && <Rank n={rank} value={value} />}
      {dot && <Dot color={dot} />}
      <span className={`min-w-0 flex-1 text-[15px] text-text ${you ? "font-bold" : ""}`}>
        {label}
        {extra}
      </span>
      <span className="text-[15px] font-bold tabular-nums text-text">{fmtPoints(value)}</span>
      {chevron && (
        <span className="text-muted">
          <IconChevronRight size={16} />
        </span>
      )}
    </button>
  );
}

const ListCard = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card [&>*+*]:border-t [&>*+*]:border-border">
    {children}
  </div>
);
const Total = ({ v }: { v: number }) => (
  <span className="flex-shrink-0 text-[15px] font-bold tabular-nums text-text">{fmtPoints(v)}</span>
);
const Empty = ({ text }: { text: string }) => (
  <p className="px-4 py-6 text-center text-[15px] text-text">{text}</p>
);

export default function WinterStandings() {
  const { userId } = useAppState();
  const { membership } = useMembership();
  const teamId = membership ? membership.teamId : undefined;
  const { config, ready: cfgReady } = useWinterConfig(teamId);
  const st = useWinterStandings(teamId, userId, config);
  const [tab, setTab] = useState<Tab>("teams");
  const [week, setWeek] = useState<WeekPick | null>(null);
  const [open, setOpen] = useState<Open[]>([]);

  const header = (title: string, info: boolean) => (
    <div className="mb-3 flex items-center gap-2">
      <Link
        href="/varsity/profile"
        aria-label="Back to Profile"
        className="tap44 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
      >
        <IconArrowLeft size={14} />
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-text">{title}</h1>
      {info && (
        <button
          type="button"
          aria-label="Rules and prizes"
          onClick={() => setOpen([{ k: "rules" }])}
          className="tap44 press-icon flex h-8 w-8 items-center justify-center text-text"
        >
          <IconInfo size={20} />
        </button>
      )}
    </div>
  );

  if (!cfgReady || !config) {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-3.5 pb-10 pt-3.5">
        {header("Winter points", false)}
        <ListCard>
          <Empty text={cfgReady ? "No winter points yet." : "Loading…"} />
        </ListCard>
      </div>
    );
  }

  const P: WinterPoints = config;
  const { cur, scores: sc, people } = st;
  const wk: WeekPick = week ?? (cur || "T");
  const tabs: { key: Tab; label: string }[] = [
    { key: "teams", label: "Teams" },
    { key: "people", label: "People" },
    ...(P.lim.classes.on ? [{ key: "classes" as Tab, label: "Classes" }] : []),
  ];
  const shownTab: Tab = tab === "classes" && !P.lim.classes.on ? "teams" : tab;
  const nameOf = (pid: string) => people[pid]?.name ?? "Teammate";
  const myTeam = userId ? teamOf(P, userId) : undefined;
  const everyone = eventPeople(P);
  const classes = classOrder
    .map((c) => ({ c, members: everyone.filter((p) => people[p]?.cls === c) }))
    .filter((x) => x.members.length > 0);
  const push = (o: Open, inSheet: boolean) => setOpen(inSheet ? [...open, o] : [o]);

  let list: React.ReactNode;
  if (!st.ready) list = <Empty text="Loading…" />;
  else if (!cur) list = <Empty text="No points yet." />;
  else if (shownTab === "teams") {
    list = P.teams.length ? (
      P.teams
        .map((t) => ({ t, v: teamValue(P, sc, t, wk, cur) }))
        .sort((a, b) => b.v - a.v)
        .map((x, i) => (
          <StandRow
            key={x.t.id}
            rank={i + 1}
            dot={x.t.color}
            label={x.t.name}
            value={x.v}
            you={x.t === myTeam}
            onClick={() => push({ k: "team", id: x.t.id }, false)}
          />
        ))
    ) : (
      <Empty text="No teams yet." />
    );
  } else if (shownTab === "people") {
    const over = cur === nWeeks(P) && P.lim.min.on && wk === "T";
    list = everyone
      .map((p) => ({ p, v: personValue(sc, p, wk, cur) }))
      .sort((a, b) => b.v - a.v)
      .map((x, i) => (
        <StandRow
          key={x.p}
          rank={i + 1}
          dot={teamOf(P, x.p)?.color}
          label={nameOf(x.p)}
          value={x.v}
          you={x.p === userId}
          extra={
            over && x.v < P.lim.min.v ? (
              <span className="mt-1 flex">
                <span className="rounded-full border border-danger bg-surface px-[7px] py-px text-[11px] font-semibold text-danger">
                  Under {fmtPoints(P.lim.min.v)}
                </span>
              </span>
            ) : null
          }
          onClick={() => push({ k: "person", id: x.p }, false)}
        />
      ));
  } else {
    list = classes.length ? (
      classes
        .map((x) => ({ ...x, v: classValue(P, sc, x.members, wk, cur) }))
        .sort((a, b) => b.v - a.v)
        .map((x, i) => (
          <StandRow
            key={x.c}
            rank={i + 1}
            label={x.c}
            value={x.v}
            you={!!userId && people[userId]?.cls === x.c}
            onClick={() => push({ k: "class", id: x.c }, false)}
          />
        ))
    ) : (
      <Empty text="No classes yet." />
    );
  }

  const top = open[open.length - 1];
  const close = () => setOpen([]);
  const personRow = (pid: string, v: number) => (
    <StandRow key={pid} label={nameOf(pid)} value={v} you={pid === userId} chevron onClick={() => push({ k: "person", id: pid }, true)} />
  );

  let sheet: React.ReactNode = null;
  if (top?.k === "team") {
    const t = P.teams.find((x) => x.id === top.id);
    if (t) {
      const vals = t.members.map((p) => ({ p, v: personValue(sc, p, wk, cur) })).sort((a, b) => b.v - a.v);
      const N = P.lim.top.v;
      sheet = (
        <Sheet title={t.name} aside={<Total v={teamValue(P, sc, t, wk, cur)} />} onClose={close}>
          {!vals.length ? (
            <ListCard>
              <Empty text="No people yet." />
            </ListCard>
          ) : wk === "T" ? (
            <ListCard>{vals.map((x) => personRow(x.p, x.v))}</ListCard>
          ) : (
            <div className="flex flex-col gap-3">
              <ListCard>{vals.slice(0, N).map((x) => personRow(x.p, x.v))}</ListCard>
              {vals.length > N && <ListCard>{vals.slice(N).map((x) => personRow(x.p, x.v))}</ListCard>}
            </div>
          )}
        </Sheet>
      );
    }
  } else if (top?.k === "class") {
    const members = classes.find((x) => x.c === top.id)?.members ?? [];
    const cv = members.map((p) => ({ p, v: personValue(sc, p, wk, cur) })).sort((a, b) => b.v - a.v);
    const drop = P.lim.classes.drop;
    sheet = (
      <Sheet title={top.id} aside={<Total v={classValue(P, sc, members, wk, cur)} />} onClose={close}>
        {wk === "T" || cv.length <= drop ? (
          <ListCard>{cv.map((x) => personRow(x.p, x.v))}</ListCard>
        ) : (
          <div className="flex flex-col gap-3">
            <ListCard>{cv.slice(0, cv.length - drop).map((x) => personRow(x.p, x.v))}</ListCard>
            {drop > 0 && <ListCard>{cv.slice(cv.length - drop).map((x) => personRow(x.p, x.v))}</ListCard>}
          </div>
        )}
      </Sheet>
    );
  } else if (top?.k === "person") {
    const pid = top.id;
    const back = open.length > 1 ? () => setOpen(open.slice(0, -1)) : null;
    let body: React.ReactNode;
    let total = 0;
    if (!cur) body = <ListCard><Empty text="No points yet." /></ListCard>;
    else if (wk === "T") {
      total = personValue(sc, pid, "T", cur);
      body = (
        <Group>
          {Array.from({ length: cur }, (_, i) => i + 1).map((w) => (
            <Row key={w} label={`Week ${w}`} detail={fmtPoints(personWeek(sc, pid, w))} onClick={() => setWeek(w)} />
          ))}
        </Group>
      );
    } else {
      const r = sc[pid]?.[wk];
      total = r?.total ?? 0;
      body = (
        <div className="flex flex-col gap-3">
          {r?.days.map((d) => <WinterDayCard key={d.date} day={d} />)}
          {r && (r.mult > 1 || r.photo > 0) && (
            <ListCard>
              {r.mult > 1 && (
                <div className="flex min-h-[48px] items-center px-4 text-[15px] text-text">
                  <span className="flex-1">Full week</span>
                  <span className="font-semibold">×{fmtNum(r.mult)}</span>
                </div>
              )}
              {r.photo > 0 && (
                <div className="flex min-h-[48px] items-center px-4 text-[15px] text-text">
                  <span className="flex-1">Photo of the week</span>
                  <span className="font-semibold">{fmtPoints(r.photo)}</span>
                </div>
              )}
            </ListCard>
          )}
        </div>
      );
    }
    sheet = (
      <Sheet title={nameOf(pid)} aside={cur ? <Total v={total} /> : null} onClose={close}>
        {back && (
          <button type="button" onClick={back} className="tap44 mb-3 flex items-center gap-1.5 text-[13px] font-medium text-text">
            <IconArrowLeft size={16} /> Back
          </button>
        )}
        {body}
      </Sheet>
    );
  } else if (top?.k === "rules") {
    sheet = (
      <Sheet title="Rules and prizes" onClose={close}>
        <div className="flex flex-col gap-4">
          <Group title="Points">
            {P.acts.map((a) => {
              const r = activityRules(a);
              return (
                <div key={a.id} className="flex min-h-[50px] items-center gap-3 px-4 py-2">
                  <Dot color={a.color} />
                  <span className="min-w-0 flex-1 text-[15px] text-text">
                    {a.name}
                    {r && <span className="mt-0.5 block text-[12.5px] text-text">{r}</span>}
                  </span>
                  <span className="whitespace-nowrap text-[13px] text-text">{activityDetail(a)}</span>
                </div>
              );
            })}
          </Group>
          <Group title="Limits">
            {limitKeys.map((k) => (
              <div key={k} className="flex min-h-[50px] items-center gap-3 px-4 py-2">
                <span className="flex-1 text-[15px] text-text">{limitSpec[k].title}</span>
                <span className="whitespace-nowrap text-[13px] text-text">{limitDetail(P.lim, k)}</span>
              </div>
            ))}
          </Group>
          {P.rules.trim() && (
            <div className="whitespace-pre-wrap rounded-2xl border border-border bg-surface px-4 py-3.5 text-[14px] leading-relaxed text-text">
              {P.rules}
            </div>
          )}
        </div>
      </Sheet>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3.5 pb-10 pt-3.5">
      {header(P.name, true)}
      <div className="flex flex-col gap-3">
        <Segmented options={tabs} value={shownTab} onChange={(k) => setTab(k)} size="md" full ariaLabel="Standings" />
        {cur > 0 && (
          <div className="overflow-x-auto [scrollbar-width:none]">
            <Segmented
              options={[
                ...Array.from({ length: cur }, (_, i) => ({ key: String(i + 1), label: `Week ${i + 1}` })),
                { key: "T", label: "Total" },
              ]}
              value={String(wk)}
              onChange={(k) => setWeek(k === "T" ? "T" : Number(k))}
              full
              ariaLabel="Week"
            />
          </div>
        )}
        <ListCard>{list}</ListCard>
      </div>
      {sheet}
    </div>
  );
}

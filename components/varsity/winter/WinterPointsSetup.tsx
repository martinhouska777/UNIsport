"use client";

/*
  WINTER POINTS, SET UP — the captain's screen (the coach has it too), under the
  Coach Console's Settings. Look A of the owner's previews (2026-11-08): the
  event's dates, the teams with their captains, the points for each activity,
  the limits, the rules and prizes. Every sheet's Save keeps the draft at once
  (the header says Saved), and nothing reaches the athletes until Publish.

  The rules, the defaults and the scoring are in lib/varsity/winterPoints.ts;
  the reads and writes in lib/varsity/winterPointsStore.ts.
*/
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Segmented from "@/components/ui/Segmented";
import Sheet from "@/components/varsity/Sheet";
import { Group, Row, RowFrame, SettingsBody, ToggleRow } from "@/components/settings/SettingsShell";
import SettingsHeader from "@/components/varsity/coach/settings/SettingsHeader";
import type { ProfileSaveState } from "@/components/profile/useProfileData";
import { IconArrowLeft, IconCheck, IconPlus, IconX } from "@/components/icons";
import { Dot } from "@/components/varsity/winter/WinterDayCard";
import type { Membership } from "@/lib/varsity/membership";
import {
  activityDetail,
  curWeek,
  defaultWinterPoints,
  fmtDate,
  fmtTime,
  isoToday,
  limitDetail,
  limitKeys,
  limitSpec,
  teamOf,
  weekdayNames,
  wpTeamColors,
  wpTypeColor,
  wpTypes,
  type LimitKey,
  type WinterPoints,
  type WpActivity,
  type WpPer,
  type WpPerson,
  type WpTeam,
  type WpType,
} from "@/lib/varsity/winterPoints";
import { fetchWinterPeople, fetchWinterRow, saveWinterPoints } from "@/lib/varsity/winterPointsStore";

type SheetState =
  | { k: "name" }
  | { k: "start" }
  | { k: "end" }
  | { k: "close" }
  | { k: "team"; id: string | null }
  | { k: "act"; id: string | null }
  | { k: "lim"; key: LimitKey }
  | { k: "rules" };

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
const parseNum = (s: string | number | null | undefined) => {
  if (s == null) return null;
  const t = String(s).trim().replace(/,/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};
const str = (n: number | null | undefined) => (n == null ? "" : String(n));

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-stretch text-left active:bg-surface-2">
      <RowFrame icon={<span className="text-primary"><IconPlus size={20} /></span>}>
        <span className="flex-1 text-[15px] font-medium text-primary">{label}</span>
      </RowFrame>
    </button>
  );
}

const fieldCls =
  "min-w-0 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-base tabular-nums text-text outline-none focus:border-primary";

function FieldRow({
  label,
  value,
  onChange,
  text,
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  text?: boolean;
  unit?: string;
}) {
  return (
    <div className="flex w-full items-stretch">
      <RowFrame>
        <span className="min-w-0 flex-1 text-[15px] text-text">{label}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode={text ? undefined : "decimal"}
          aria-label={label}
          className={`${fieldCls} ${text ? "w-44 text-left" : "w-20 text-right"}`}
        />
        {unit && <span className="text-[14px] text-text">{unit}</span>}
      </RowFrame>
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex w-full items-stretch">
      <RowFrame>
        <span className="min-w-0 flex-1 text-[15px] text-text">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={`${fieldCls} max-w-[200px] cursor-pointer`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </RowFrame>
    </div>
  );
}

function SaveButtons({ onSave, onDelete }: { onSave: () => void; onDelete?: () => void }) {
  return (
    <div className="mt-5 flex flex-col gap-2.5">
      <Button size="lg" className="w-full" onClick={onSave}>
        Save
      </Button>
      {onDelete && (
        <Button variant="dangerSoft" size="md" className="w-full" onClick={onDelete}>
          Delete
        </Button>
      )}
    </div>
  );
}

const ErrorLine = ({ text }: { text: string }) =>
  text ? (
    <p role="alert" className="mt-3 text-[13px] font-semibold text-danger">
      {text}
    </p>
  ) : null;

const surname = (people: Record<string, WpPerson>, id: string) =>
  (people[id]?.name ?? "").split(" ").slice(-1)[0] ?? "";

export default function WinterPointsSetup({ membership }: { membership: Membership }) {
  const teamId = membership.teamId;
  const [draft, setDraft] = useState<WinterPoints | null>(null);
  const [published, setPublished] = useState<WinterPoints | null>(null);
  const [people, setPeople] = useState<Record<string, WpPerson>>({});
  const [failed, setFailed] = useState(false);
  const [saveState, setSaveState] = useState<ProfileSaveState>("idle");
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([fetchWinterRow(teamId), fetchWinterPeople(teamId)]).then(([row, ppl]) => {
      if (!active) return;
      setFailed(row.failed);
      setDraft(row.draft ?? row.config ?? defaultWinterPoints());
      setPublished(row.config);
      setPeople(ppl);
    });
    return () => {
      active = false;
    };
  }, [teamId]);

  if (!draft) {
    return (
      <>
        <SettingsHeader title="Winter points" />
        <p className="px-4 py-16 text-center text-sm text-muted">
          {failed ? "Couldn’t load winter points." : "Loading winter points…"}
        </p>
      </>
    );
  }

  const keep = async (next: WinterPoints) => {
    setDraft(next);
    setSheet(null);
    setSaveState("saving");
    const r = await saveWinterPoints(teamId, next, false);
    setSaveState(r.error ? "error" : "saved");
  };

  const publish = async () => {
    setPublishing(true);
    setPublishError("");
    const r = await saveWinterPoints(teamId, draft, true);
    setPublishing(false);
    if (r.error) setPublishError("Couldn’t publish. Check your signal and try again.");
    else setPublished(clone(draft));
  };

  const dirty = JSON.stringify(draft) !== JSON.stringify(published);
  const D = draft;

  return (
    <div className="w-full">
      <SettingsHeader title={D.name} saveState={saveState} />
      <SettingsBody>
        <Group title="Event">
          <Row label="Name" detail={D.name} onClick={() => setSheet({ k: "name" })} />
          <Row label="Starts" detail={fmtDate(D.start)} onClick={() => setSheet({ k: "start" })} />
          <Row label="Ends" detail={fmtDate(D.end)} onClick={() => setSheet({ k: "end" })} />
          <Row
            label="Week closes"
            detail={`${weekdayNames[D.closeDay].slice(0, 3)} ${fmtTime(D.closeTime)}`}
            onClick={() => setSheet({ k: "close" })}
          />
        </Group>

        <Group title="Teams">
          {D.teams.map((t) => (
            <Row
              key={t.id}
              icon={<Dot color={t.color} />}
              label={t.name}
              detail={surname(people, t.captain)}
              onClick={() => setSheet({ k: "team", id: t.id })}
            />
          ))}
          <AddRow label="Add a team" onClick={() => setSheet({ k: "team", id: null })} />
        </Group>

        <Group title="Points">
          {D.acts.map((a) => (
            <Row
              key={a.id}
              icon={<Dot color={a.color} />}
              label={a.name}
              detail={activityDetail(a)}
              onClick={() => setSheet({ k: "act", id: a.id })}
            />
          ))}
          <AddRow label="Add an activity" onClick={() => setSheet({ k: "act", id: null })} />
        </Group>

        <Group title="Limits">
          {limitKeys.map((k) => (
            <Row key={k} label={limitSpec[k].title} detail={limitDetail(D.lim, k)} onClick={() => setSheet({ k: "lim", key: k })} />
          ))}
        </Group>

        <Group>
          <Row label="Rules and prizes" onClick={() => setSheet({ k: "rules" })} />
        </Group>
      </SettingsBody>

      <div className="sticky bottom-0 z-10 border-t border-border bg-surface px-4 py-3">
        <div className="mx-auto max-w-screen-sm">
          {publishError && (
            <p role="alert" className="mb-2 text-[12px] font-semibold text-danger">
              {publishError}
            </p>
          )}
          {dirty ? (
            <Button size="lg" className="w-full" onClick={publish} disabled={publishing}>
              {publishing ? "Publishing…" : "Publish"}
            </Button>
          ) : (
            <div className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface text-[15px] font-semibold text-text">
              <span className="text-success">
                <IconCheck size={16} />
              </span>
              Published
            </div>
          )}
        </div>
      </div>

      {sheet?.k === "name" && <NameSheet draft={D} onClose={() => setSheet(null)} onSave={keep} />}
      {(sheet?.k === "start" || sheet?.k === "end") && (
        <DateSheet which={sheet.k} draft={D} onClose={() => setSheet(null)} onSave={keep} />
      )}
      {sheet?.k === "close" && <CloseSheet draft={D} onClose={() => setSheet(null)} onSave={keep} />}
      {sheet?.k === "team" && (
        <TeamSheet draft={D} id={sheet.id} people={people} onClose={() => setSheet(null)} onSave={keep} />
      )}
      {sheet?.k === "act" && <ActivitySheet draft={D} id={sheet.id} onClose={() => setSheet(null)} onSave={keep} />}
      {sheet?.k === "lim" && (
        <LimitSheet draft={D} limit={sheet.key} people={people} onClose={() => setSheet(null)} onSave={keep} />
      )}
      {sheet?.k === "rules" && <RulesSheet draft={D} onClose={() => setSheet(null)} onSave={keep} />}
    </div>
  );
}

type SheetProps = { draft: WinterPoints; onClose: () => void; onSave: (next: WinterPoints) => void };

function NameSheet({ draft, onClose, onSave }: SheetProps) {
  const [name, setName] = useState(draft.name);
  const [err, setErr] = useState("");
  const save = () => {
    if (!name.trim()) return setErr("Add a name");
    onSave({ ...clone(draft), name: name.trim() });
  };
  return (
    <Sheet title="Name" onClose={onClose}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Name"
        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-primary"
      />
      <ErrorLine text={err} />
      <SaveButtons onSave={save} />
    </Sheet>
  );
}

function DateSheet({ which, draft, onClose, onSave }: SheetProps & { which: "start" | "end" }) {
  const [v, setV] = useState(draft[which]);
  const [err, setErr] = useState("");
  const title = which === "start" ? "Starts" : "Ends";
  const save = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return setErr("Add a date");
    const s = which === "start" ? v : draft.start;
    const e = which === "end" ? v : draft.end;
    if (e < s) return setErr("Ends before it starts");
    onSave({ ...clone(draft), [which]: v });
  };
  return (
    <Sheet title={title} onClose={onClose}>
      <input
        type="date"
        value={v}
        onChange={(e) => setV(e.target.value)}
        aria-label={title}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-primary"
      />
      <ErrorLine text={err} />
      <SaveButtons onSave={save} />
    </Sheet>
  );
}

function CloseSheet({ draft, onClose, onSave }: SheetProps) {
  const [day, setDay] = useState(String(draft.closeDay));
  const [time, setTime] = useState(draft.closeTime);
  return (
    <Sheet title="Week closes" onClose={onClose}>
      <Group>
        <SelectRow
          label="Day"
          value={day}
          onChange={setDay}
          options={[1, 2, 3, 4, 5, 6, 0].map((i) => ({ value: String(i), label: weekdayNames[i] }))}
        />
        <div className="flex w-full items-stretch">
          <RowFrame>
            <span className="min-w-0 flex-1 text-[15px] text-text">Time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time" className={fieldCls} />
          </RowFrame>
        </div>
      </Group>
      <SaveButtons onSave={() => onSave({ ...clone(draft), closeDay: Number(day), closeTime: time || "21:00" })} />
    </Sheet>
  );
}

function TeamSheet({
  draft,
  id,
  people,
  onClose,
  onSave,
}: SheetProps & { id: string | null; people: Record<string, WpPerson> }) {
  const existing = id ? draft.teams.find((t) => t.id === id) : undefined;
  const [t, setT] = useState<WpTeam>(() =>
    existing
      ? clone(existing)
      : {
          id: `t${Date.now().toString(36)}`,
          name: "",
          color: wpTeamColors.find((c) => !draft.teams.some((x) => x.color === c)) ?? wpTeamColors[0],
          captain: "",
          members: [],
        },
  );
  const [picking, setPicking] = useState(false);
  const [err, setErr] = useState("");
  const nameOf = (pid: string) => people[pid]?.name ?? "Teammate";

  const save = () => {
    const name = t.name.trim();
    if (!name) return setErr("Add a name");
    const team: WpTeam = { ...t, name, captain: t.members.includes(t.captain) ? t.captain : (t.members[0] ?? "") };
    const next = clone(draft);
    // A person is on one team: whoever was added here leaves the team they were on.
    next.teams = next.teams.map((x) => {
      if (x.id === team.id) return x;
      const members = x.members.filter((p) => !team.members.includes(p));
      return { ...x, members, captain: members.includes(x.captain) ? x.captain : (members[0] ?? "") };
    });
    if (existing) next.teams = next.teams.map((x) => (x.id === team.id ? team : x));
    else next.teams.push(team);
    onSave(next);
  };
  const remove = () => onSave({ ...clone(draft), teams: draft.teams.filter((x) => x.id !== t.id) });

  if (picking) {
    const others = Object.values(people)
      .filter((p) => !t.members.includes(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return (
      <Sheet title="Add a person" onClose={onClose}>
        <button
          type="button"
          onClick={() => setPicking(false)}
          className="tap44 mb-3 flex items-center gap-1.5 text-[13px] font-medium text-text"
        >
          <IconArrowLeft size={16} /> Back
        </button>
        <Group>
          {others.length === 0 ? (
            <p className="px-4 py-5 text-center text-[14px] text-text">No one else on the team yet.</p>
          ) : (
            others.map((p) => {
              const on = teamOf(draft, p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setT({ ...t, members: [...t.members, p.id], captain: t.captain || p.id });
                    setPicking(false);
                  }}
                  className="flex w-full items-stretch text-left active:bg-surface-2"
                >
                  <RowFrame icon={on ? <Dot color={on.color} /> : <span className="w-2.5" />}>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-text">{p.name}</span>
                    {on && <span className="truncate text-[13px] text-muted">{on.name}</span>}
                  </RowFrame>
                </button>
              );
            })
          )}
        </Group>
      </Sheet>
    );
  }

  return (
    <Sheet title={existing ? t.name || "Team" : "New team"} onClose={onClose}>
      <Group>
        <FieldRow label="Name" value={t.name} onChange={(v) => setT({ ...t, name: v })} text />
        <SelectRow
          label="Captain"
          value={t.captain}
          onChange={(v) => setT({ ...t, captain: v })}
          options={t.members.length ? t.members.map((p) => ({ value: p, label: nameOf(p) })) : [{ value: "", label: "None" }]}
        />
      </Group>
      <div className="mt-4">
        <Group title="People">
          {t.members.map((p) => (
            <div key={p} className="flex w-full items-stretch">
              <RowFrame>
                <span className="min-w-0 flex-1 truncate text-[15px] text-text">{nameOf(p)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${nameOf(p)}`}
                  onClick={() => {
                    const members = t.members.filter((x) => x !== p);
                    setT({ ...t, members, captain: t.captain === p ? (members[0] ?? "") : t.captain });
                  }}
                  className="tap44 press-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text"
                >
                  <IconX size={13} />
                </button>
              </RowFrame>
            </div>
          ))}
          <AddRow label="Add a person" onClick={() => setPicking(true)} />
        </Group>
      </div>
      <ErrorLine text={err} />
      <SaveButtons onSave={save} onDelete={existing ? remove : undefined} />
    </Sheet>
  );
}

function ActivitySheet({ draft, id, onClose, onSave }: SheetProps & { id: string | null }) {
  const existing = id ? draft.acts.find((a) => a.id === id) : undefined;
  const [a, setA] = useState(() => ({
    name: existing?.name ?? "",
    type: (existing?.type ?? "other") as WpType,
    points: str(existing?.points),
    per: (existing?.per ?? "min") as WpPer,
    most: str(existing?.most),
    short: str(existing?.short),
    cday: str(existing?.cday),
    hr: existing?.hr ?? false,
    cardio: existing?.cardio ?? true,
  }));
  const [err, setErr] = useState("");
  const opt = (x: string) => {
    const n = parseNum(x);
    return n == null || Number.isNaN(n) || n <= 0 ? null : Math.round(n);
  };
  const save = () => {
    const name = a.name.trim();
    if (!name) return setErr("Add a name");
    const pts = parseNum(a.points);
    if (pts == null || Number.isNaN(pts) || pts < 0) return setErr("Add the points");
    const next = clone(draft);
    const act: WpActivity = {
      id: existing?.id ?? `a${Date.now().toString(36)}`,
      key: existing?.key ?? "",
      name,
      type: a.type,
      color: existing && existing.type === a.type ? existing.color : wpTypeColor[a.type],
      points: pts,
      per: a.per,
      most: opt(a.most),
      short: opt(a.short),
      cday: opt(a.cday),
      hr: a.hr,
      cardio: a.cardio,
    };
    if (existing) next.acts = next.acts.map((x) => (x.id === act.id ? act : x));
    else next.acts.push(act);
    onSave(next);
  };
  const remove = () => onSave({ ...clone(draft), acts: draft.acts.filter((x) => x.id !== existing?.id) });

  return (
    <Sheet title={existing ? a.name || "Activity" : "New activity"} onClose={onClose}>
      <Group>
        <FieldRow label="Name" value={a.name} onChange={(v) => setA({ ...a, name: v })} text />
        <SelectRow
          label="Logged as"
          value={a.type}
          onChange={(v) => setA({ ...a, type: v as WpType })}
          options={wpTypes.map((t) => ({ value: t.key, label: t.label }))}
        />
        <FieldRow label="Points" value={a.points} onChange={(v) => setA({ ...a, points: v })} />
        <div className="flex w-full items-stretch">
          <RowFrame>
            <span className="min-w-0 flex-1 text-[15px] text-text">Per</span>
            <Segmented
              options={[
                { key: "min", label: "Minute" },
                { key: "km", label: "Km" },
                { key: "session", label: "Session" },
              ]}
              value={a.per}
              onChange={(k) => setA({ ...a, per: k as WpPer })}
              ariaLabel="Per"
            />
          </RowFrame>
        </div>
        <FieldRow label="Most a week" value={a.most} onChange={(v) => setA({ ...a, most: v })} />
        <FieldRow label="Shortest" value={a.short} onChange={(v) => setA({ ...a, short: v })} unit="min" />
        <FieldRow label="Cardio that day" value={a.cday} onChange={(v) => setA({ ...a, cday: v })} />
        <ToggleRow label="Needs heart rate" on={a.hr} onChange={() => setA({ ...a, hr: !a.hr })} />
        <ToggleRow label="Counts as cardio" on={a.cardio} onChange={() => setA({ ...a, cardio: !a.cardio })} />
      </Group>
      <ErrorLine text={err} />
      <SaveButtons onSave={save} onDelete={existing ? remove : undefined} />
    </Sheet>
  );
}

function LimitSheet({
  draft,
  limit,
  people,
  onClose,
  onSave,
}: SheetProps & { limit: LimitKey; people: Record<string, WpPerson> }) {
  const spec = limitSpec[limit];
  const src = draft.lim[limit] as unknown as { on: boolean; winners?: Record<string, string> } & Record<string, number>;
  const [on, setOn] = useState(src.on);
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(spec.fields.map(([, f]) => [f, str(src[f])])),
  );
  const [winners, setWinners] = useState<Record<string, string>>(() => ({ ...(src.winners ?? {}) }));
  const [pickWeek, setPickWeek] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const cw = curWeek(draft, isoToday());

  const save = () => {
    const out: Record<string, unknown> = { on: spec.noSwitch ? true : on };
    for (const [, f] of spec.fields) {
      const n = parseNum(vals[f]);
      const good = n != null && !Number.isNaN(n) && (f === "drop" ? n >= 0 : f === "bonus" ? n >= 1 : n > 0);
      if (!good) return setErr("Add a number");
      out[f] = f === "bonus" ? Math.round((n as number) * 100) / 100 : Math.round(n as number);
    }
    if (limit === "photo") out.winners = winners;
    const next = clone(draft);
    (next.lim as Record<string, unknown>)[limit] = out;
    onSave(next);
  };

  if (pickWeek != null) {
    const all = Object.values(people).sort((a, b) => a.name.localeCompare(b.name));
    const pick = (pid: string | null) => {
      const w = { ...winners };
      if (pid) w[String(pickWeek)] = pid;
      else delete w[String(pickWeek)];
      setWinners(w);
      setPickWeek(null);
    };
    return (
      <Sheet title={`Week ${pickWeek}`} onClose={onClose}>
        <button
          type="button"
          onClick={() => setPickWeek(null)}
          className="tap44 mb-3 flex items-center gap-1.5 text-[13px] font-medium text-text"
        >
          <IconArrowLeft size={16} /> Back
        </button>
        <Group>
          <button type="button" onClick={() => pick(null)} className="flex w-full items-stretch text-left active:bg-surface-2">
            <RowFrame>
              <span className="flex-1 text-[15px] text-text">No one</span>
            </RowFrame>
          </button>
          {all.map((p) => {
            const t = teamOf(draft, p.id);
            const chosen = winners[String(pickWeek)] === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p.id)}
                className={`flex w-full items-stretch text-left active:bg-surface-2 ${chosen ? "bg-primary-tint" : ""}`}
              >
                <RowFrame icon={t ? <Dot color={t.color} /> : <span className="w-2.5" />}>
                  <span className={`min-w-0 flex-1 truncate text-[15px] text-text ${chosen ? "font-semibold" : ""}`}>
                    {p.name}
                  </span>
                </RowFrame>
              </button>
            );
          })}
        </Group>
      </Sheet>
    );
  }

  return (
    <Sheet title={spec.title} onClose={onClose}>
      <Group>
        {!spec.noSwitch && <ToggleRow label={spec.title} on={on} onChange={() => setOn(!on)} />}
        {spec.fields.map(([label, f]) => (
          <FieldRow key={f} label={label} value={vals[f]} onChange={(v) => setVals({ ...vals, [f]: v })} />
        ))}
      </Group>
      {limit === "photo" && cw > 0 && (
        <div className="mt-4">
          <Group title="Winners">
            {Array.from({ length: cw }, (_, i) => i + 1).map((w) => (
              <Row key={w} label={`Week ${w}`} detail={people[winners[String(w)]]?.name} onClick={() => setPickWeek(w)} />
            ))}
          </Group>
        </div>
      )}
      <ErrorLine text={err} />
      <SaveButtons onSave={save} />
    </Sheet>
  );
}

function RulesSheet({ draft, onClose, onSave }: SheetProps) {
  const [rules, setRules] = useState(draft.rules);
  return (
    <Sheet title="Rules and prizes" onClose={onClose}>
      <textarea
        value={rules}
        onChange={(e) => setRules(e.target.value)}
        aria-label="Rules and prizes"
        className="block min-h-[300px] w-full resize-y rounded-xl border border-border bg-surface px-3.5 py-3 text-base leading-relaxed text-text outline-none focus:border-primary"
      />
      <SaveButtons onSave={() => onSave({ ...clone(draft), rules })} />
    </Sheet>
  );
}

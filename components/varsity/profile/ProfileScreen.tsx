"use client";

/*
  Varsity PROFILE screen — the athlete's record.
  Renders lib/varsity/profile.ts: identity, current status, a full-month
  training calendar (activity dots + legend + monthly summary), the season
  training portfolio (stats + personal bests), and the shareable report card.
  Static for now — the status / edit / settings / copy actions get wired up in
  a later "make it interactive" pass.
*/
import { profile, activityColor, activityLegend, type ActivityType } from "@/lib/varsity/profile";
import {
  IconSettings,
  IconPencil,
  IconAnchor,
  IconActivity,
  IconChevronRight,
  IconArrowRight,
  IconChevronDown,
  IconGlobe,
  IconCopy,
} from "@/components/icons";

function SectionHeader({
  label,
  meta,
  link,
}: {
  label: string;
  meta?: string;
  link?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-5">
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </div>
      {meta && <div className="text-[10px] text-muted">{meta}</div>}
      {link && (
        <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
          {link}
          <IconArrowRight size={12} />
        </span>
      )}
    </div>
  );
}

/* ─── Identity ─── */
function Identity() {
  const id = profile.identity;
  return (
    <div className="border-b border-border bg-[radial-gradient(circle_at_0%_0%,rgba(165,28,48,0.07),transparent_60%)] px-4 pb-4 pt-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex gap-3.5">
          <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/15 to-primary/5">
            <span className="text-xl font-semibold text-primary">{id.initials}</span>
            <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-[2.5px] border-background bg-success" />
          </div>
          <div className="min-w-0 pt-0.5">
            <div className="text-xl font-semibold leading-tight text-text">{id.name}</div>
            <div className="mt-1 text-[11px] text-muted">{id.classLine}</div>
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-1 text-[9px] text-text">
              <span className="text-accent">
                <IconAnchor size={11} />
              </span>
              {id.seat}
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Settings"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-muted"
        >
          <IconSettings size={16} />
        </button>
      </div>
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[11px] font-medium text-text"
      >
        <IconPencil size={14} />
        Edit profile · weight, height, contact
      </button>
    </div>
  );
}

/* ─── Status ─── */
function StatusCard() {
  const s = profile.status;
  return (
    <div className="mx-3.5 mt-3.5 overflow-hidden rounded-2xl border border-border bg-surface">
      <button type="button" className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-success/30 bg-success/15 text-success">
          <IconActivity size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">
            Current status
          </div>
          <div className="mt-0.5 text-[13px] font-medium text-text">{s.title}</div>
          <div className="mt-0.5 text-[10px] text-muted">{s.sub}</div>
        </div>
        <span className="text-muted">
          <IconChevronRight size={17} />
        </span>
      </button>
    </div>
  );
}

/* ─── Calendar ─── */
function Dot({ type }: { type: ActivityType }) {
  if (type === "planned")
    return (
      <span
        className="h-[5px] w-[5px] rounded-full border"
        style={{ borderColor: activityColor.planned }}
      />
    );
  if (type === "missed")
    return (
      <span
        className="h-1 w-1 rounded-full border border-dashed"
        style={{ borderColor: activityColor.missed }}
      />
    );
  if (type === "rest")
    return (
      <span className="h-1 w-1 rounded-full opacity-50" style={{ background: activityColor.rest }} />
    );
  return <span className="h-1 w-1 rounded-full" style={{ background: activityColor[type] }} />;
}

function CalendarCard() {
  const c = profile.calendar;
  const dayNames = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="mx-3.5 overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-text">{c.month}</span>
          <span className="text-[10px] font-medium tracking-wide text-muted">{c.year}</span>
        </div>
        <div className="flex gap-1">
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface-2 text-muted">
            <IconChevronDown size={14} className="rotate-90" />
          </span>
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface-2 text-muted">
            <IconChevronDown size={14} className="-rotate-90" />
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border px-2 pb-1 pt-2">
        {dayNames.map((d, i) => (
          <div key={i} className="py-0.5 text-center text-[8px] font-semibold tracking-[0.14em] text-muted">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-[3px] px-2 pb-2.5 pt-1.5">
        {Array.from({ length: c.leadingEmpty }).map((_, i) => (
          <div key={`e${i}`} className="aspect-square" />
        ))}
        {c.days.map((d) => (
          <div
            key={d.num}
            className={`flex aspect-square flex-col items-center justify-center rounded-[9px] pt-0.5 ${
              d.today ? "border border-primary/35 bg-primary/15" : ""
            }`}
          >
            <span
              className={`text-[12px] font-medium leading-none ${
                d.today
                  ? "font-bold text-primary"
                  : d.missed
                    ? "text-danger/60"
                    : d.future
                      ? "text-muted"
                      : "text-text"
              }`}
            >
              {d.num}
            </span>
            <span className="mt-[3px] flex h-1 items-center gap-0.5">
              {d.dots.map((t, i) => (
                <Dot key={i} type={t} />
              ))}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-border bg-surface-2 px-3.5 py-2.5">
        {activityLegend.map((l) => (
          <div key={l.type} className="flex items-center gap-1 text-[9px] text-muted">
            <Dot type={l.type} />
            {l.label}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3.5 border-t border-border px-3.5 py-3">
        {c.summary.map((s, i) => (
          <div key={s.lbl} className="flex items-center gap-3.5">
            {i > 0 && <div className="h-6 w-px bg-border" />}
            <div>
              <div className="text-sm font-semibold leading-none text-text">{s.val}</div>
              <div className="mt-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">
                {s.lbl}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Portfolio ─── */
function PortfolioCard() {
  const p = profile.portfolio;
  return (
    <div className="mx-3.5 overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex border-b border-border">
        {p.stats.map((s, i) => (
          <div key={s.lbl} className={`flex-1 px-2 py-3.5 text-center ${i > 0 ? "border-l border-border" : ""}`}>
            <div className="text-lg font-semibold leading-none text-text">{s.val}</div>
            <div className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">
              {s.lbl}
            </div>
            <div className="mt-0.5 text-[8px] text-success">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="px-3.5 pb-3.5 pt-3">
        <div className="mb-2.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">
          Personal Bests
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {p.prs.map((pr) => (
            <div
              key={pr.name}
              className="flex items-baseline justify-between rounded-lg border border-border bg-surface-2 px-2.5 py-2"
            >
              <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">
                {pr.name}
              </span>
              <span className="text-[13px] font-semibold text-text">{pr.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Shareable report ─── */
function ReportCard() {
  const r = profile.report;
  return (
    <div className="relative mx-3.5 mt-3.5 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-surface">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
      <div className="flex items-start gap-3 px-4 pb-3 pt-3.5">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/15 text-accent">
          <IconGlobe size={20} />
        </span>
        <div className="flex-1">
          <div className="mb-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-accent">
            Shareable training report
          </div>
          <div className="text-base font-semibold leading-tight text-text">{r.title}</div>
          <div className="mt-1.5 text-[11px] leading-relaxed text-muted">{r.sub}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-accent/15 bg-black/20 px-3.5 py-2.5">
        <div className="flex-1 truncate rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-[10px] text-muted">
          hubc.app/m/<span className="text-text">martin-novak-2026</span>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.06em] text-background"
        >
          <IconCopy size={12} />
          COPY
        </button>
      </div>
    </div>
  );
}

export default function ProfileScreen() {
  return (
    <div className="mx-auto w-full max-w-screen-sm pb-8">
      <Identity />
      <StatusCard />

      <SectionHeader label="Training Calendar" link="Open full" />
      <CalendarCard />

      <SectionHeader label="Training Portfolio" meta={profile.portfolio.season} />
      <PortfolioCard />

      <div className="pt-1">
        <ReportCard />
      </div>
    </div>
  );
}

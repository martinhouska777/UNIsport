"use client";

/*
  START A CHANNEL — the WhatsApp way (owner, 2026-09-14: "just look at WhatsApp
  how it does it and copy it").

    1. NEW CHANNEL — a name, and who can join: Public (anyone at your school can
       find it and join) or Private (only the people you add). A round button
       bottom-right: ✓ creates a public channel, → goes on for a private one.
    2. ADD MEMBERS (private only) — search people, tick them; the ones picked
       sit along the top as photos with an × to drop them, and ✓ creates.
       With nothing typed the list is the people you know (you message or
       follow them); typing finds anyone by name.

  The channel belongs to your school and you are its first member. The database
  checks the name (2–40 characters, not one your school already has) and its
  refusal is shown under the name, as it is.

  Opened in place of the list, like a thread, so the bottom nav stays put.
  All colours are theme tokens (rule 1).
*/
import { useEffect, useState, type ReactNode } from "react";
import { useAppState } from "@/components/AppState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import Avatar from "./Avatar";
import { createChannel, findChannelPeople, type ChannelPerson } from "@/lib/supabase/messages";
import { getUniversity } from "@/lib/themes";
import { residenceLabel } from "@/lib/onboarding";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconGlobe,
  IconLock,
  IconMessage,
  IconSearch,
  IconX,
} from "@/components/icons";

export default function NewChannel({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (channel: { channelId: string; name: string; isPrivate: boolean }) => void;
}) {
  const { universityKey } = useAppState();
  const school = getUniversity(universityKey)?.shortName ?? "your school";
  const [step, setStep] = useState<"details" | "members">("details");
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [picked, setPicked] = useState<ChannelPerson[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clean = name.replace(/^#+\s*/, "").replace(/\s+/g, " ").trim();
  const nameOk = clean.length >= 2;

  const create = async () => {
    if (!nameOk || busy) return;
    setBusy(true);
    setError(null);
    try {
      const channelId = await createChannel(clean, universityKey, {
        private: isPrivate,
        memberIds: isPrivate ? picked.map((p) => p.id) : [],
      });
      onCreated({ channelId, name: clean, isPrivate });
    } catch (e) {
      // It is the NAME that gets refused, so back to where the name is.
      setError((e as Error).message);
      setBusy(false);
      setStep("details");
    }
  };

  if (step === "members") {
    return (
      <AddMembers
        picked={picked}
        onChange={setPicked}
        busy={busy}
        onBack={() => setStep("details")}
        onDone={() => void create()}
      />
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <Header title="New channel" onBack={onBack} />
      <form
        className="min-h-0 flex-1 overflow-y-auto px-3.5 py-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nameOk) return;
          if (isPrivate) setStep("members");
          else void create();
        }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
            <IconMessage size={22} />
          </span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={40}
            autoFocus
            autoComplete="off"
            placeholder="Channel name"
            aria-label="Channel name"
            // 16px so a phone doesn't zoom in on focus.
            className="w-full border-b-2 border-border bg-transparent py-2 text-base text-text outline-none placeholder:text-muted focus:border-primary"
          />
        </div>
        {error && <p className="mt-2 pl-[60px] text-[12px] text-danger">{error}</p>}

        <div
          role="radiogroup"
          aria-label="Who can join"
          className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface"
        >
          <Choice
            icon={<IconGlobe size={18} />}
            title="Public"
            sub={`Anyone at ${school} can find and join`}
            on={!isPrivate}
            onPick={() => setIsPrivate(false)}
          />
          <Choice
            icon={<IconLock size={18} />}
            title="Private"
            sub="Only people you add"
            on={isPrivate}
            onPick={() => setIsPrivate(true)}
            divided
          />
        </div>

        <Fab type="submit" label={isPrivate ? "Next: add members" : "Create channel"} disabled={!nameOk || busy}>
          {isPrivate ? <IconArrowRight size={22} /> : <IconCheck size={22} />}
        </Fab>
      </form>
    </div>
  );
}

function AddMembers({
  picked,
  onChange,
  busy,
  onBack,
  onDone,
}: {
  picked: ChannelPerson[];
  onChange: (next: ChannelPerson[]) => void;
  busy: boolean;
  onBack: () => void;
  onDone: () => void;
}) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<ChannelPerson[] | null>(null);
  const typed = query.trim();

  // The people you know straight away; a typed name after a short pause.
  useEffect(() => {
    let active = true;
    const timer = setTimeout(
      () => {
        findChannelPeople(typed)
          .then((rows) => active && setPeople(rows))
          .catch(() => active && setPeople([]));
      },
      typed ? 250 : 0,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [typed]);

  const isPicked = (id: string) => picked.some((p) => p.id === id);
  const toggle = (p: ChannelPerson) =>
    onChange(isPicked(p.id) ? picked.filter((x) => x.id !== p.id) : [...picked, p]);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <Header
        title="Add members"
        sub={picked.length ? `${picked.length} selected` : undefined}
        onBack={onBack}
      />
      <div className="bg-surface px-3 pb-2 pt-2">
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 text-muted">
          <IconSearch size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Search people"
            aria-label="Search people"
            className="w-full bg-transparent py-2 text-base text-text outline-none placeholder:text-muted"
          />
        </div>
      </div>

      {/* The people picked so far, like WhatsApp: a photo each, × to drop. */}
      {picked.length > 0 && (
        <div className="flex gap-3 overflow-x-auto border-b border-border px-3.5 py-2.5">
          {picked.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p)}
              aria-label={`Remove ${p.name}`}
              className="flex w-14 shrink-0 flex-col items-center gap-1"
            >
              <span className="relative">
                <Avatar size={48} src={p.photo} name={p.name} />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-surface-2 text-muted">
                  <IconX size={10} />
                </span>
              </span>
              <span className="w-full truncate text-center text-[11px] text-text">{p.name.split(/\s+/)[0]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pb-24">
        {people === null ? (
          <SkeletonRows count={6} />
        ) : people.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-muted">
            {typed ? "No one by that name." : "Search for anyone by name."}
          </div>
        ) : (
          <>
            {!typed && (
              <div className="px-3.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                People you know
              </div>
            )}
            {people.map((p) => {
              const on = isPicked(p.id);
              const sub = [p.residence ? residenceLabel(p.residence) : null, p.classYear]
                .filter(Boolean)
                .join(" · ");
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p)}
                  aria-pressed={on}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-surface-2"
                >
                  <Avatar size={44} src={p.photo} name={p.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-text">{p.name}</span>
                    {sub && <span className="block truncate text-[12px] text-muted">{sub}</span>}
                  </span>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      on ? "border-primary bg-primary text-primary-contrast" : "border-border"
                    }`}
                  >
                    {on && <IconCheck size={13} />}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>

      <Fab label="Create channel" disabled={busy} onClick={onDone}>
        <IconCheck size={22} />
      </Fab>
    </div>
  );
}

function Header({ title, sub, onBack }: { title: string; sub?: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2.5">
      <button type="button" onClick={onBack} aria-label="Back" className="tap44 text-muted">
        <IconArrowLeft size={18} />
      </button>
      <div className="min-w-0">
        <h1 className="text-[14px] font-medium leading-tight text-text">{title}</h1>
        {sub && <div className="text-[11px] text-muted">{sub}</div>}
      </div>
    </div>
  );
}

function Choice({
  icon,
  title,
  sub,
  on,
  onPick,
  divided = false,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  on: boolean;
  onPick: () => void;
  divided?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onPick}
      className={`flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-surface-2 ${
        divided ? "border-t border-border" : ""
      }`}
    >
      <span className="text-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-text">{title}</span>
        <span className="block text-[12px] text-muted">{sub}</span>
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          on ? "border-primary" : "border-border"
        }`}
      >
        {on && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </span>
    </button>
  );
}

/* The round button bottom-right that moves you on, as WhatsApp has it. */
function Fab({
  label,
  disabled,
  onClick,
  type = "button",
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="absolute bottom-5 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-live text-primary-contrast shadow-lg active:scale-95 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

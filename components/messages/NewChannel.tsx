"use client";

/*
  START A CHANNEL (owner, 2026-09-14: "anybody can start it"). A name and a
  Create button — the channel belongs to your school, you are its first member,
  and it opens straight away. The database checks the name (2–40 characters,
  not one your school already has) and its refusal is shown as it is.

  Opened in place of the list, like a thread, so the bottom nav stays put.
  All colours are theme tokens (rule 1).
*/
import { useState } from "react";
import Button from "@/components/ui/Button";
import { useAppState } from "@/components/AppState";
import { createChannel } from "@/lib/supabase/messages";
import { IconArrowLeft } from "@/components/icons";

export default function NewChannel({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (channel: { channelId: string; name: string }) => void;
}) {
  const { universityKey } = useAppState();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clean = name.replace(/^#+\s*/, "").replace(/\s+/g, " ").trim();
  const ready = clean.length >= 2 && !busy;

  const create = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const channelId = await createChannel(clean, universityKey);
      onCreated({ channelId, name: clean });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2.5">
        <button type="button" onClick={onBack} aria-label="Back" className="tap44 text-muted">
          <IconArrowLeft size={18} />
        </button>
        <h1 className="text-[13px] font-medium text-text">New channel</h1>
      </div>

      <form
        className="px-3.5 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <label htmlFor="channel-name" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Name
        </label>
        <div className="mt-1.5 flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 focus-within:border-primary">
          <span className="text-base text-muted">#</span>
          <input
            id="channel-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={40}
            autoFocus
            autoComplete="off"
            placeholder="e.g. morning runners"
            // 16px so a phone doesn't zoom in on focus.
            className="w-full bg-transparent py-2.5 text-base text-text outline-none placeholder:text-muted"
          />
        </div>
        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
        <Button type="submit" size="lg" full disabled={!ready} className="mt-4">
          {busy ? "Creating…" : "Create channel"}
        </Button>
      </form>
    </div>
  );
}

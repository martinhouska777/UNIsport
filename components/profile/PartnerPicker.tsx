"use client";

/*
  PARTNER PICKER — choose the REAL app person you trained with, used by the Log
  Session editor. Full-screen over the editor (z above it). The candidate list is
  the people you already have a connection with: your matches + anyone you've
  messaged (deduped). Picking one stores a real link (their profile id), so the
  Profile tab can count distinct people and tap through to their profile.

  "Solo (no partner)" clears the partner. All colors are theme tokens (rule 1);
  the search input stays text-base so phones don't auto-zoom.
*/
import { useEffect, useMemo, useState } from "react";
import Avatar from "@/components/messages/Avatar";
import { getBrowseMatches } from "@/lib/supabase/matching";
import { listDirectConversations } from "@/lib/supabase/messages";
import { residenceLabel } from "@/lib/onboarding";
import { IconArrowLeft, IconSearch, IconUser, IconCheck } from "@/components/icons";

export type PartnerPick = { id: string; name: string };

type Candidate = { id: string; name: string; sub: string | null };

export default function PartnerPicker({
  userId,
  currentId,
  onPick,
  onClear,
  onClose,
}: {
  userId: string;
  currentId?: string | null;
  onPick: (p: PartnerPick) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Candidate[] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Load matches + DM peers in parallel, then merge & dedupe by profile id.
  useEffect(() => {
    let active = true;
    Promise.all([
      getBrowseMatches(userId).catch(() => []),
      listDirectConversations().catch(() => []),
    ]).then(([matches, dms]) => {
      if (!active) return;
      const byId = new Map<string, Candidate>();
      for (const m of matches) {
        byId.set(m.userId, {
          id: m.userId,
          name: m.name,
          sub: m.residence ? residenceLabel(m.residence) : null,
        });
      }
      for (const d of dms) {
        if (!byId.has(d.otherId)) {
          byId.set(d.otherId, { id: d.otherId, name: d.otherName, sub: null });
        }
      }
      setPeople([...byId.values()].sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const results = useMemo(() => {
    if (!people) return [];
    const q = query.trim().toLowerCase();
    return q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;
  }, [people, query]);

  return (
    <div className="fixed inset-0 z-[60] flex h-dvh flex-col bg-background">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border bg-surface px-4 py-3">
        <button type="button" onClick={onClose} className="flex items-center gap-1 text-[13px] text-muted">
          <IconArrowLeft size={18} /> Cancel
        </button>
        <span className="ml-1 text-[15px] font-semibold text-text">Training partner</span>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 border-b border-border bg-surface px-4 pb-2.5 pt-2.5">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3">
          <IconSearch size={15} className="text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people"
            className="w-full bg-transparent py-2.5 text-base text-text outline-none placeholder:text-muted"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mx-auto w-full max-w-screen-sm">
          {/* Solo / clear */}
          <button
            type="button"
            onClick={() => {
              onClear();
              onClose();
            }}
            className="mb-2 flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left active:bg-surface-2"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-muted">
              <IconUser size={18} />
            </span>
            <span className="text-[14px] font-medium text-text">Solo (no partner)</span>
            {!currentId && <IconCheck size={16} className="ml-auto text-primary" />}
          </button>

          {people === null ? (
            <div className="py-10 text-center text-[12px] text-muted">Loading people…</div>
          ) : results.length === 0 ? (
            <div className="px-2 py-10 text-center text-[12px] text-muted">
              {people.length === 0
                ? "No connections yet. Match with or message someone, then they'll show up here as a training partner."
                : "No one matches that search."}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onPick({ id: p.id, name: p.name });
                    onClose();
                  }}
                  className="flex items-center gap-3 py-2.5 text-left active:bg-surface-2"
                >
                  <Avatar size={40} alt={p.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-text">{p.name}</span>
                    {p.sub && <span className="block truncate text-[11px] text-muted">{p.sub}</span>}
                  </span>
                  {currentId === p.id && <IconCheck size={16} className="flex-shrink-0 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

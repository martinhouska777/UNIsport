"use client";

/*
  SETTINGS → BLOCKED. The people you blocked, a row each with their photo and
  name and an Unblock button, Instagram's Blocked accounts. Blocking hides both
  of you from each other everywhere, so this is the one place they still show
  (db/safety_2026-11-07.sql, lib/supabase/safety.ts).
*/
import { useEffect, useState } from "react";
import Avatar from "@/components/messages/Avatar";
import Button from "@/components/ui/Button";
import { Group, RowFrame, SettingsBody, SettingsHeader } from "@/components/settings/SettingsShell";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { listBlocked, unblockUser, type BlockedPerson } from "@/lib/supabase/safety";

export default function BlockedSettingsPage() {
  const [people, setPeople] = useState<BlockedPerson[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listBlocked()
      .then((p) => active && setPeople(p))
      .catch(() => active && setPeople([]));
    return () => {
      active = false;
    };
  }, []);

  const unblock = async (id: string) => {
    setBusy(id);
    setError("");
    try {
      await unblockUser(id);
      setPeople((p) => (p ?? []).filter((x) => x.id !== id));
    } catch {
      setError("Couldn’t unblock. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <SettingsHeader title="Blocked" />
      <SettingsBody>
        {people === null ? (
          <SkeletonLines count={3} />
        ) : people.length === 0 ? (
          <p className="px-1 py-6 text-center text-[15px] text-text">No blocked people.</p>
        ) : (
          <Group>
            {people.map((p) => (
              <div key={p.id} className="flex w-full items-stretch">
                <RowFrame wide icon={<Avatar size={32} src={p.photo} alt={p.name} />}>
                  <span className="min-w-0 flex-1 truncate text-[15px] text-text">{p.name}</span>
                  <Button size="sm" variant="secondary" disabled={busy === p.id} onClick={() => unblock(p.id)}>
                    Unblock
                  </Button>
                </RowFrame>
              </div>
            ))}
          </Group>
        )}
        {error && <p className="px-1 text-[13px] text-danger">{error}</p>}
      </SettingsBody>
    </>
  );
}

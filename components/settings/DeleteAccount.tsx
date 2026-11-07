"use client";

/*
  DELETE ACCOUNT, in both Settings (student and Varsity Mode), App Review
  Guideline 5.1.1(v). A red row; it asks once, the way Replay athlete setup
  does, because nothing brings an account back. Then /api/account/delete
  removes it, the app signs out and goes to the front page.
*/
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import Button from "@/components/ui/Button";
import { Group, RowFrame } from "@/components/settings/SettingsShell";
import { IconTrash } from "@/components/icons";

export default function DeleteAccount() {
  const { logout } = useAppState();
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      await logout().catch(() => {});
      router.replace("/");
    } catch {
      setError("Couldn’t delete the account. Try again.");
      setBusy(false);
    }
  };

  if (armed)
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
        <div className="text-[15px] font-medium text-text">Delete your account for good?</div>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" size="lg" className="flex-1" disabled={busy} onClick={() => setArmed(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="lg" className="flex-1" disabled={busy} onClick={remove}>
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </div>
        {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      </div>
    );

  return (
    <Group>
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="flex w-full items-stretch text-left transition-colors active:bg-surface-2"
      >
        <RowFrame icon={<IconTrash size={20} className="text-danger" />}>
          <span className="flex-1 text-[15px] text-danger">Delete account</span>
        </RowFrame>
      </button>
    </Group>
  );
}

"use client";

/*
  SHARE — the one button that invites someone in.

  Every Share in the app (Profile, a house row on the boards, the race card,
  Match's empty state) is this component, so the link and the words are the
  same everywhere (lib/invite.ts). It knows who is asking (the signed-in
  profile) and which school; the house defaults to the sender's own and can be
  overridden for "invite someone into Adams" on a house that is short.

  Opens the phone's share sheet; on a laptop it copies the link and says so.
  Colours are theme tokens.
*/
import { useState } from "react";
import Button, { type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { useAppState } from "@/components/AppState";
import { useProfileData } from "@/components/profile/useProfileData";
import { buildInvite, shareInvite } from "@/lib/invite";
import { IconSend, IconCheck } from "@/components/icons";

export default function ShareInviteButton({
  residence,
  label = "Share",
  variant = "secondary",
  size = "lg",
  full = false,
  iconOnly = false,
  className = "",
}: {
  /** The house the invite is about. Defaults to the sender's own residence. */
  residence?: string | null;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  /** A small round icon, for sitting on a row. */
  iconOnly?: boolean;
  className?: string;
}) {
  const { universityKey } = useAppState();
  const { data } = useProfileData();
  const [state, setState] = useState<"idle" | "copied" | "busy">("idle");

  const send = async () => {
    if (state === "busy") return;
    setState("busy");
    const invite = buildInvite({
      universityKey,
      residence: residence ?? (data?.residence as string | undefined) ?? null,
      fromName: (data?.name as string | undefined) ?? null,
    });
    const outcome = await shareInvite(invite);
    if (outcome === "copied") {
      setState("copied");
      window.setTimeout(() => setState("idle"), 1800);
    } else {
      setState("idle");
    }
  };

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={send}
        aria-label={state === "copied" ? "Invite link copied" : "Share an invite"}
        title="Invite someone"
        className={`tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted ${className}`}
      >
        {state === "copied" ? <IconCheck size={14} /> : <IconSend size={14} />}
      </button>
    );
  }

  return (
    <Button variant={variant} size={size} full={full} onClick={send} disabled={state === "busy"} className={className}>
      {state === "copied" ? (
        <>
          <IconCheck size={15} /> Link copied
        </>
      ) : (
        <>
          <IconSend size={15} /> {label}
        </>
      )}
    </Button>
  );
}

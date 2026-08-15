"use client";

/*
  Shared chrome for the two invite screens (/join and /join/<code>).

  The important bit is BACK. These screens are reached two different ways and
  back has to mean different things:
    • signed in  — you came from Settings → "Join a varsity team", so back is
      Settings. It must never drop you on the landing page or the gyms tab.
    • signed out — you tapped a link from WhatsApp with no account, so back is
      the public landing page.

  Zone 1 styling (`l-*` tokens): a stranger can land here before signing in, so
  neutral brand only — no university colors.
*/
import type { ReactNode } from "react";
import Link from "next/link";
import { instrumentSerif } from "@/components/landing/fonts";
import { useAppState } from "@/components/AppState";
import { IconArrowLeft } from "@/components/icons";

export default function JoinShell({ badge, children }: { badge: string; children: ReactNode }) {
  const { loggedIn } = useAppState();
  // Signed-in people always came through Settings; send them straight back.
  const back = loggedIn ? "/settings" : "/";

  return (
    <div
      className={`${instrumentSerif.variable} relative flex min-h-dvh flex-col items-center justify-center bg-l-bg px-6 text-center font-sans text-l-text`}
    >
      <Link
        href={back}
        aria-label="Back"
        className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-l-border text-l-text-2 hover:text-l-text"
      >
        <IconArrowLeft size={18} />
      </Link>

      <div className="w-full max-w-sm">
        <Link
          href={back}
          className="mb-8 inline-block font-display text-2xl italic tracking-tight text-l-text"
        >
          UNI<span className="text-l-varsity">sport</span>
        </Link>

        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-l-varsity-soft bg-l-varsity-dim px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-l-varsity">
          {badge}
        </div>

        {children}
      </div>
    </div>
  );
}

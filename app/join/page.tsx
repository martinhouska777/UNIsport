import Link from "next/link";
import { instrumentSerif } from "@/components/landing/fonts";

/*
  Varsity entry (Zone 1) — placeholder. The real Canvas-style flow (university +
  team / invite code, then Supabase sign-in → /varsity) is built in a later slice.
  Gold varsity accent, kept distinct from the blue student path.
*/
export default function JoinPage() {
  return (
    <div
      className={`${instrumentSerif.variable} flex min-h-dvh flex-col items-center justify-center bg-l-bg px-6 text-center font-sans text-l-text`}
    >
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 inline-block font-display text-2xl italic tracking-tight text-l-text"
        >
          UNI<span className="text-l-varsity">sport</span>
        </Link>

        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-l-varsity-soft bg-l-varsity-dim px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-l-varsity">
          Varsity Mode
        </div>

        <h1 className="font-display text-3xl text-l-text">Join your team</h1>
        <p className="mt-2 text-sm text-l-text-2">
          Varsity Mode is gated by your team. The sign-in step (university + invite
          code) is coming next.
        </p>

        <Link
          href="/login"
          className="mt-8 inline-block text-xs font-medium text-l-text-2 hover:text-l-text"
        >
          ← I&apos;m a regular student
        </Link>
      </div>
    </div>
  );
}

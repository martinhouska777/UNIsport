import type { ReactNode } from "react";

/*
  Shared scaffold for the Varsity Mode screens while we build them out one by
  one. Shows the screen title and a short note so the structure (theme, oar
  rails, nav) can be reviewed before the real content lands.
*/
export default function VarsityScaffold({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-1 flex-col px-5 py-6">
      {kicker && (
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-accent">
          {kicker}
        </div>
      )}
      <h1 className="mt-1 text-2xl font-semibold text-text">{title}</h1>

      <div className="mt-6 flex flex-1 items-center justify-center">
        <div className="w-full rounded-2xl border border-border bg-surface px-6 py-10 text-center">
          <p className="text-sm text-muted">
            {children ?? "This Varsity screen is coming next."}
          </p>
        </div>
      </div>
    </div>
  );
}

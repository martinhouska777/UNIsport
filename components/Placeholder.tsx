import type { ReactNode } from "react";

// Empty, themed placeholder used by each tab until we build the real screen.
export default function Placeholder({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-text">{title}</h1>
        <p className="mt-2 text-sm text-muted">
          {children ?? "This screen is coming soon."}
        </p>
      </div>
    </div>
  );
}

"use client";

/*
  ?practice=<day_key> opens the builder straight onto that practice — the
  Today screen's "Boats" door. Without it the tab opens on the day picker as
  before. useSearchParams() needs a Suspense boundary or the production build
  fails, the same way app/(app)/match/page.tsx handles it.
*/
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LineupBuilderScreen from "@/components/varsity/coach/lineup/LineupBuilderScreen";

function LineupWithParams() {
  const search = useSearchParams();
  return <LineupBuilderScreen openKey={search.get("practice")} />;
}

export default function CoachLineupPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-10 text-center text-[13px] text-muted">Loading lineup…</div>}>
      <LineupWithParams />
    </Suspense>
  );
}

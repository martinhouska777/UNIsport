"use client";

/*
  ?slot=<day_key> opens the plan straight onto that slot's editor — the Today
  screen's "Edit session" door. Without it the tab opens on the blocks list as
  before. useSearchParams() needs a Suspense boundary or the production build
  fails, the same way app/(app)/match/page.tsx handles it.
*/
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TrainingPlanScreen from "@/components/varsity/coach/plan/TrainingPlanScreen";

function PlanWithParams() {
  const search = useSearchParams();
  return <TrainingPlanScreen openSlot={search.get("slot")} />;
}

export default function CoachPlanPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-10 text-center text-[13px] text-muted">Loading plan…</div>}>
      <PlanWithParams />
    </Suspense>
  );
}

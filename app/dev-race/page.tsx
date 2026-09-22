"use client";

/* Throwaway review harness — deleted once the screenshots are taken. */
import dynamic from "next/dynamic";
import ThemeProvider from "@/components/ThemeProvider";
import { varsityTheme } from "@/lib/varsity/theme";
import { days } from "./data";

const RaceBoard = dynamic(() => import("@/components/varsity/team/RaceBoard"), { ssr: false });

export default function DevRace() {
  const i =
    typeof window === "undefined"
      ? 0
      : Math.max(0, Math.min(days.length - 1, Number(new URLSearchParams(window.location.search).get("d") ?? 0) || 0));
  const day = days[i];
  return (
    <ThemeProvider tokens={varsityTheme} paintRoot className="min-h-dvh bg-background">
      <RaceBoard
        key={day.dayKey}
        day={day}
        dateLabel={day.label}
        title={day.title}
        boats={[]}
        inConsole
        onChange={() => {}}
        onDeleted={() => {}}
        onClose={() => {}}
      />
    </ThemeProvider>
  );
}

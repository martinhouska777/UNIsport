"use client";

/* THROWAWAY review route — delete before committing. Renders the calendar's
   colour legend in the varsity theme so the six kinds can be eyeballed. */
import ThemeProvider from "@/components/ThemeProvider";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import { kindLegend, kindBar, kindBlock, kindColor, type SessionKind } from "@/lib/varsity/home";

export default function DevKinds() {
  const theme = useVarsityTheme();
  const all: SessionKind[] = [...kindLegend.map((l) => l.kind), "off"];
  return (
    <ThemeProvider tokens={theme} paintRoot className="min-h-screen bg-background p-6">
      <h1 className="mb-4 text-xl font-semibold text-text">Calendar kinds</h1>

      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2.5">
        {kindLegend.map((l) => (
          <span key={l.kind} className="flex items-center gap-1 text-[11px] text-muted">
            <span className="h-1.5 w-3 rounded-sm" style={kindBar(l.kind)} />
            {l.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {all.map((k) => (
          <div key={k} className="rounded px-2 py-3" style={kindBlock(k)}>
            <span className="block text-[10px] font-bold text-text">{k}</span>
            <span className="block text-[9px] text-muted">{kindColor[k]}</span>
          </div>
        ))}
      </div>
    </ThemeProvider>
  );
}

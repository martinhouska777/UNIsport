"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LAB_FONTS, LAB_FONT_GROUPS } from "@/lib/lab/fonts";
import { decodeLab, encodeLab, LAB_COMBOS, LAB_GROUNDS, LAB_PRESETS, LAB_TODAY, LAB_TYPE_PAIRS, type LabRadius, type LabState, type LabWidth } from "@/lib/lab/state";
import { deriveCss, deriveFontLinks, deriveHandover, deriveTokens } from "@/lib/lab/derive";

/*
  THE DESIGN LAB — the landing page's version of the app's Colour Lab.

  Dev only (app/lab/page.tsx refuses to render outside `npm run dev`). The
  REAL landing runs in the frame on the right; the dials on the left write
  CSS variables and font links straight into that frame's document, so what
  the owner sees is the shipped page — its scroll stories, phones and school
  colours included — wearing a different look. Nothing in the landing's own
  code knows the lab exists; the frame is same-origin, which is all it takes.

  Every dial lives in the URL hash (and the settings box), so a look can be
  pasted into chat and opened again. `deriveHandover` prints the token block
  that goes into app/globals.css when a look is chosen.

  The lab's own chrome uses the landing tokens (bg-l-*, text-l-*) — with the
  default values, since only the FRAME is restyled. No hex here (rule 1).
*/

const STORAGE_KEY = "unisport-design-lab";
const FRAME_SRC = "/?lab=1";

const JUMPS: { label: string; sel: string }[] = [
  { label: "Intro", sel: "#top" },
  { label: "Never train alone", sel: "#student-intro" },
  { label: "Student story", sel: "#story1" },
  { label: "Campus colours", sel: "#campus-colours" },
  { label: "Varsity Mode", sel: "#interlude" },
  { label: "Varsity story", sel: "#story2" },
  { label: "Blade Lock", sel: "#blade-lock" },
  { label: "Coach", sel: "#coaches" },
  { label: "FAQ", sel: "#faq" },
  { label: "About", sel: "#about" },
  { label: "Contact", sel: "#contact" },
];

const WIDTHS: { id: LabWidth; label: string }[] = [
  { id: "full", label: "Full" },
  { id: "1280", label: "Laptop" },
  { id: "820", label: "Tablet" },
  { id: "390", label: "Phone" },
];

const RADII: { id: LabRadius; label: string }[] = [
  { id: "pill", label: "Pills" },
  { id: "12", label: "12" },
  { id: "6", label: "6" },
  { id: "0", label: "Square" },
];

export default function DesignLab() {
  // First paint: the hash wins, then the last session, then today's page.
  // Safe to read the window here — LabClient mounts this with ssr: false.
  const [state, setState] = useState<LabState>(() => {
    try {
      if (location.hash.length > 1) return decodeLab(location.hash);
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return decodeLab(saved);
    } catch {}
    return LAB_TODAY;
  });
  const [copied, setCopied] = useState<"settings" | "css" | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  const css = useMemo(() => deriveCss(state), [state]);
  const links = useMemo(() => deriveFontLinks(state), [state]);
  const settings = useMemo(() => encodeLab(state), [state]);
  const handover = useMemo(() => deriveHandover(state), [state]);

  // Write the look into the frame: one <style>, one <link> per font family.
  const apply = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc?.head) return;
    let style = doc.getElementById("lab-style") as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement("style");
      style.id = "lab-style";
      doc.head.appendChild(style);
    }
    if (style.textContent !== css) style.textContent = css;
    // keep the style last so it beats anything HMR appends later
    if (doc.head.lastElementChild !== style) doc.head.appendChild(style);
    const have = new Set(Array.from(doc.querySelectorAll<HTMLLinkElement>("link[data-lab-font]")).map((l) => l.href));
    for (const href of links) {
      if (have.has(href)) continue;
      const link = doc.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.labFont = "1";
      doc.head.insertBefore(link, style);
    }
    // (No attribute on <html>: the frame's React hydrates AFTER onLoad and
    // reports anything it did not render itself as a mismatch.)
  }, [css, links]);

  useEffect(() => {
    apply();
    try {
      history.replaceState(null, "", `#${settings}`);
      localStorage.setItem(STORAGE_KEY, settings);
    } catch {}
  }, [apply, settings]);

  const set = <K extends keyof LabState>(k: K, v: LabState[K]) => setState((p) => ({ ...p, [k]: v }));

  const jump = (sel: string) => {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    if (sel === "#top") doc.defaultView?.scrollTo({ top: 0, behavior: "smooth" });
    else doc.querySelector(sel)?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const copy = async (what: "settings" | "css") => {
    try {
      await navigator.clipboard.writeText(what === "settings" ? settings : handover);
      setCopied(what);
      setTimeout(() => setCopied(null), 1400);
    } catch {}
  };

  const frameWidth = state.width === "full" ? "100%" : `${state.width}px`;

  return (
    <div className="flex h-svh overflow-hidden bg-l-bg font-sans text-l-text">
      {/* ——— the dials ——— */}
      <aside className="flex w-[340px] shrink-0 flex-col overflow-y-auto border-r border-l-line bg-l-bg-elevated text-[13px]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-l-line bg-l-bg-elevated px-4 py-3">
          <div>
            <div className="font-semibold tracking-tight">Design Lab</div>
            <div className="text-[11px] text-l-text-2">the landing, live · dev only</div>
          </div>
          <button
            type="button"
            onClick={() => setState((p) => ({ ...LAB_TODAY, width: p.width }))}
            className="rounded-md border border-l-line px-2.5 py-1 text-[12px] text-l-text-2 transition-colors hover:border-l-line-hover hover:text-l-text"
          >
            Reset to today
          </button>
        </header>

        <Section title="Start from">
          <div className="flex flex-wrap gap-1.5">
            {LAB_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.note}
                onClick={() => setState((s) => ({ ...LAB_TODAY, ...p.state, width: s.width }))}
                className="rounded-md border border-l-line bg-l-surface px-2.5 py-1.5 text-[12px] transition-colors hover:border-l-line-hover"
              >
                {p.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-l-text-2">Whole looks — ground, accents, type, shape. Hover a name for what it tries.</p>

          <div className="mt-4 mb-1.5 text-[11px] font-medium">Backgrounds</div>
          <div className="flex flex-wrap gap-1.5">
            {LAB_GROUNDS.map((p) => {
              const t = deriveTokens({ ...LAB_TODAY, ...p.state }).tokens;
              return (
                <button
                  key={p.id}
                  type="button"
                  title={p.note}
                  onClick={() => setState((s) => ({ ...s, ...p.state }))}
                  className="inline-flex items-center gap-1.5 rounded-md border border-l-line bg-l-surface py-1.5 pr-2.5 pl-2 text-[12px] transition-colors hover:border-l-line-hover"
                >
                  {/* the swatch is the preset's own ground colour — data, not a component colour */}
                  <span className="h-3 w-3 rounded-sm border border-l-line-hover" style={{ background: t["--color-l-bg"] }} />
                  {p.name}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-l-text-2">Ground and the two accents only — your fonts, effects and shape stay. Light first, then dark.</p>

          <div className="mt-4 mb-1.5 text-[11px] font-medium">Pairs — page · blocks</div>
          <div className="flex flex-wrap gap-1.5">
            {LAB_COMBOS.map((p) => {
              const t = deriveTokens({ ...LAB_TODAY, ...p.state }).tokens;
              return (
                <button
                  key={p.id}
                  type="button"
                  title={p.note}
                  onClick={() => setState((s) => ({ ...s, ...p.state }))}
                  className="inline-flex items-center gap-1.5 rounded-md border border-l-line bg-l-surface py-1.5 pr-2.5 pl-2 text-[12px] transition-colors hover:border-l-line-hover"
                >
                  {/* two swatches: the page, then the blocks on it — both from the preset's data */}
                  <span className="flex overflow-hidden rounded-sm border border-l-line-hover">
                    <span className="h-3 w-3" style={{ background: t["--color-l-bg"] }} />
                    <span className="h-3 w-3" style={{ background: t["--color-l-surface"] }} />
                  </span>
                  {p.name}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-l-text-2">The page colour and the colour of the blocks on it: the two title cards, Contact, and — half-way — the pills and feature rows. Set the blocks yourself under Ground.</p>
        </Section>

        <Section title="Ground">
          <Range label="Page lightness" hint={state.light >= 55 ? "light page" : "dark page"} min={0} max={100} value={state.light} onChange={(v) => set("light", v)} />
          <Range label="Tint hue" hint={`${state.hue}°`} min={0} max={360} value={state.hue} onChange={(v) => set("hue", v)} />
          <Range label="Tint strength" min={0} max={100} value={state.tint} onChange={(v) => set("tint", v)} />
          <Range label="Surface & line steps" min={0} max={100} value={state.step} onChange={(v) => set("step", v)} />
          <Range label="Grey text contrast" min={0} max={100} value={state.textc} onChange={(v) => set("textc", v)} />
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-[12px]">Blocks (title cards, Contact)</span>
            {state.surface ? (
              <button type="button" onClick={() => set("surface", "")} className="rounded-md border border-l-line px-2 py-1 text-[11px] text-l-text-2 hover:border-l-line-hover hover:text-l-text">
                Back to auto
              </button>
            ) : (
              <span className="font-mono text-[11px] text-l-text-2">auto, by steps</span>
            )}
          </div>
          <ColorField label="" value={state.surface || deriveTokens(state).tokens["--color-l-surface"]} onChange={(v) => set("surface", v)} />
        </Section>

        <Section title="Accents">
          <ColorField label="Student accent" value={state.accent} onChange={(v) => set("accent", v)} />
          <ColorField label="Varsity accent" value={state.varsity} onChange={(v) => set("varsity", v)} />
          <p className="mt-1 text-[11px] leading-relaxed text-l-text-2">The eight school colours are content and stay as they are.</p>
        </Section>

        <Section title="Type">
          <div className="mb-1.5 text-[11px] font-medium">Pairings to try</div>
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {LAB_TYPE_PAIRS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.note}
                onClick={() => setState((s) => ({ ...s, ...p.state }))}
                className="rounded-md border border-l-line bg-l-surface px-2.5 py-1.5 text-[12px] transition-colors hover:border-l-line-hover"
              >
                {p.name}
              </button>
            ))}
          </div>
          <p className="mb-4 text-[11px] leading-relaxed text-l-text-2">Headline, body and kicker fonts with their weight, tracking and case — colours stay. Hover for the mood and the grounds it suits.</p>
          <FontSelect label="Headlines" value={state.display} onChange={(v) => set("display", v)} />
          <div className="grid grid-cols-2 gap-x-3">
            <Range label="Weight" min={300} max={900} step={100} value={state.dweight} onChange={(v) => set("dweight", v)} />
            <Range label="Tracking" hint={`${(state.dtrack / 1000).toFixed(3)}em`} min={-80} max={80} value={state.dtrack} onChange={(v) => set("dtrack", v)} />
          </div>
          <div className="mb-3 flex gap-4">
            <Toggle label="Italic emphasis" checked={state.ditalic} onChange={(v) => set("ditalic", v)} />
            <Toggle label="UPPERCASE" checked={state.dupper} onChange={(v) => set("dupper", v)} />
          </div>
          <FontSelect label="Body text" value={state.body} onChange={(v) => set("body", v)} />
          <FontSelect label="Small labels (kickers)" value={state.kicker} onChange={(v) => set("kicker", v)} extra={<option value="body">Same as body</option>} />
          <Toggle label="Kickers in capitals" checked={state.kupper} onChange={(v) => set("kupper", v)} />
        </Section>

        <Section title="Effects & shape">
          <Range label="Grid overlay" hint={state.grid === 0 ? "off" : `×${state.grid}`} min={0} max={3} step={0.25} value={state.grid} onChange={(v) => set("grid", v)} />
          <Range label="Glow" hint={state.glow === 0 ? "off" : `×${state.glow}`} min={0} max={2} step={0.1} value={state.glow} onChange={(v) => set("glow", v)} />
          <Segmented label="Buttons & pills" options={RADII} value={state.radius} onChange={(v) => set("radius", v)} />
        </Section>

        <Section title="Preview">
          <Segmented label="Width" options={WIDTHS} value={state.width} onChange={(v) => set("width", v)} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {JUMPS.map((j) => (
              <button key={j.sel} type="button" onClick={() => jump(j.sel)} className="rounded-md border border-l-line px-2 py-1 text-[11px] text-l-text-2 transition-colors hover:border-l-line-hover hover:text-l-text">
                {j.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Hand it over">
          <p className="mb-2 text-[11px] leading-relaxed text-l-text-2">Paste either box into chat. The first is the settings (the page address carries the same); the second is the code block that applies the look.</p>
          <textarea readOnly value={settings} rows={3} className="mb-1.5 w-full resize-none rounded-md border border-l-line bg-l-bg p-2 font-mono text-[10.5px] leading-snug text-l-text-2" />
          <button type="button" onClick={() => copy("settings")} className="mb-3 rounded-md border border-l-line px-2.5 py-1 text-[12px] transition-colors hover:border-l-line-hover">
            {copied === "settings" ? "Copied" : "Copy settings"}
          </button>
          <textarea readOnly value={handover} rows={12} className="mb-1.5 w-full resize-none rounded-md border border-l-line bg-l-bg p-2 font-mono text-[10.5px] leading-snug text-l-text-2" />
          <button type="button" onClick={() => copy("css")} className="rounded-md border border-l-line px-2.5 py-1 text-[12px] transition-colors hover:border-l-line-hover">
            {copied === "css" ? "Copied" : "Copy code block"}
          </button>
        </Section>
      </aside>

      {/* ——— the page ——— */}
      <main className="flex flex-1 justify-center overflow-hidden bg-l-surface">
        <iframe
          ref={frame}
          src={FRAME_SRC}
          title="The landing page, restyled live"
          onLoad={apply}
          className="h-full border-0 bg-l-bg transition-[width] duration-300"
          style={{ width: frameWidth, maxWidth: "100%" }}
        />
      </main>
    </div>
  );
}

// ——— the controls ———

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-b border-l-line">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 font-mono text-[10px] tracking-[0.12em] uppercase text-l-text-2 select-none hover:text-l-text">
        {title}
        <span className="text-l-text-3 transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="px-4 pt-1 pb-4">{children}</div>
    </details>
  );
}

function Range({ label, hint, min, max, step = 1, value, onChange }: { label: string; hint?: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 flex justify-between text-[12px]">
        <span>{label}</span>
        <span className="font-mono text-[11px] text-l-text-2">{hint ?? value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-l-accent" />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  // The typed hex and the value it was typed against; when the picker (or a
  // preset) moves the value from outside, the field follows — during render,
  // not in an effect.
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(value);
  }
  const commit = (v: string) => {
    const h = v.trim().replace(/^#?/, "#").toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(h)) onChange(h);
  };
  return (
    <label className="mb-2.5 flex items-center justify-between gap-3">
      <span className="text-[12px]">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value)}
          className="w-[84px] rounded-md border border-l-line bg-l-bg px-2 py-1 font-mono text-[11px] text-l-text"
          spellCheck={false}
        />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 cursor-pointer rounded-md border border-l-line bg-l-bg p-0.5" />
      </span>
    </label>
  );
}

function FontSelect({ label, value, onChange, extra }: { label: string; value: string; onChange: (v: string) => void; extra?: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[12px]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-l-line bg-l-bg px-2 py-1.5 text-[12px] text-l-text">
        {extra}
        {LAB_FONT_GROUPS.map((g) => (
          <optgroup key={g.group} label={g.label}>
            {LAB_FONTS.filter((f) => f.group === g.group).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[12px]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-l-accent" />
      {label}
    </label>
  );
}

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-2">
      <span className="mb-1 block text-[12px]">{label}</span>
      <div className="inline-flex overflow-hidden rounded-md border border-l-line">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`px-2.5 py-1 text-[12px] transition-colors ${o.id === value ? "bg-l-accent-soft text-l-text" : "text-l-text-2 hover:bg-l-surface"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

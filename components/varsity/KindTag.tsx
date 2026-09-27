/*
  THE SESSION'S NAME AS A TAG — "Water · UT1" in the session's own colour, on
  a light wash of it (owner, 2026-09-27, preview "C"). The athlete's Home and
  the coach's Today draw it the same, beside the stripe down the card's left.

  `color` is content colour (the coach's plan palette), already taken through
  markColor so it reads as text on white; it is applied inline — rule 1's
  exception.
*/
export default function KindTag({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-[0.04em]"
      style={{ color, background: `color-mix(in oklab, ${color} 14%, transparent)` }}
    >
      {label}
    </span>
  );
}

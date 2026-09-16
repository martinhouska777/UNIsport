/*
  A PENCIL STICKER — a real-looking pencil (sharpened wood tip, graphite point,
  painted body, metal band, pink eraser) with a white die-cut edge and a soft
  shadow, lying on the diagonal like the classic edit mark (owner, 2026-09-16:
  "crimson red and more realistic, like a pencil … stickers look like
  stickers").

  The painted body is the school colour (var(--primary)); every other colour is
  the object's own, from lib/stickers.ts (rule 1). Decorative: the button that
  holds it carries the label.
*/
import { pencilColors as c } from "@/lib/stickers";

export default function PencilSticker({ size = 22 }: { size?: number }) {
  // Drawn lying flat (tip left, eraser right) in a 48×48 box, then turned 45°
  // so the tip points down-left.
  const outline = "M3 24 L14 18.5 H45 V29.5 H14 Z";
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      style={{ filter: `drop-shadow(0 1px 1.2px ${c.dropShadow})` }}
    >
      <g transform="rotate(-45 24 24)">
        {/* the sticker's white edge, drawn under everything */}
        <path d={outline} fill={c.outline} stroke={c.outline} strokeWidth={5} strokeLinejoin="round" />
        {/* sharpened wood */}
        <path d="M4 24 L14 19.5 V28.5 Z" fill={c.wood} />
        <path d="M4 24 L14 24 V28.5 Z" fill={c.woodShade} />
        {/* graphite point */}
        <path d="M4 24 L7.8 22.3 V25.7 Z" fill={c.graphite} />
        {/* painted body, three facets */}
        <rect x={14} y={19.5} width={21} height={9} fill="var(--primary)" />
        <rect x={14} y={19.5} width={21} height={3} fill={c.shine} />
        <rect x={14} y={25.5} width={21} height={3} fill={c.shade} />
        {/* scalloped edge where the paint meets the wood */}
        <path d="M14 19.5 Q16 21 14 22.5 Q16 24 14 25.5 Q16 27 14 28.5 Z" fill="var(--primary)" />
        {/* metal band */}
        <rect x={35} y={19.5} width={4.5} height={9} fill={c.ferrule} />
        <rect x={35} y={25.5} width={4.5} height={3} fill={c.ferruleShade} />
        <rect x={36.3} y={19.5} width={0.7} height={9} fill={c.ferruleShade} />
        <rect x={37.9} y={19.5} width={0.7} height={9} fill={c.ferruleShade} />
        {/* eraser */}
        <path d="M39.5 19.5 H42.5 A2 2 0 0 1 44.5 21.5 V26.5 A2 2 0 0 1 42.5 28.5 H39.5 Z" fill={c.eraser} />
        <path d="M39.5 25.5 H44.5 V26.5 A2 2 0 0 1 42.5 28.5 H39.5 Z" fill={c.eraserShade} />
      </g>
    </svg>
  );
}

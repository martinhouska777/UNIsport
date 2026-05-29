import type { SVGProps } from "react";

/*
  Tiny inline-SVG icon set (no external icon dependency).
  Every icon draws with `currentColor`, so its color is whatever the parent
  text color is — which always comes from a theme variable (e.g. text-accent).
*/
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 16, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconSearch = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Base>
);

export const IconClock = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Base>
);

// Filled star for ratings — use text-accent to make it gold.
export const IconStar = (p: IconProps) => (
  <Base {...p} fill="currentColor" stroke="none">
    <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z" />
  </Base>
);

// "Floors" indicator (stacked stairs).
export const IconFloors = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 19h4v-4h4v-4h4V7h6" />
  </Base>
);

export const IconArrowLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="M19 12H5" />
    <path d="M12 19l-7-7 7-7" />
  </Base>
);

export const IconHeart = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Base {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z" />
  </Base>
);

export const IconMapPin = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="2.5" />
  </Base>
);

export const IconBarbell = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />
  </Base>
);

export const IconRun = (p: IconProps) => (
  <Base {...p}>
    <circle cx="14" cy="5" r="1.6" />
    <path d="M5 20l3-5 3 1 1-4-4-2 4-2 3 3 3 1" />
  </Base>
);

export const IconSwimming = (p: IconProps) => (
  <Base {...p}>
    <circle cx="8" cy="8" r="1.6" />
    <path d="M5 13l4-2 4 3 3-2" />
    <path d="M3 19c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0" />
  </Base>
);

export const IconBasketball = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3v18M5.6 5.6c3 3 9.8 3 12.8 0M5.6 18.4c3-3 9.8-3 12.8 0" />
  </Base>
);

export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

// Pulse / heart-rate line — used for the "Cardio" activity.
export const IconActivity = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12h3l2 6 4-13 2 7h7" />
  </Base>
);

export const IconBell = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Base>
);

export const IconMessage = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 21 12z" />
  </Base>
);

export const IconCalendar = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </Base>
);

export const IconCamera = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 9a2 2 0 0 1 2-2h2l1.5-2h7L17 7h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <circle cx="12" cy="13" r="3.2" />
  </Base>
);

export const IconChevronDown = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 9l6 6 6-6" />
  </Base>
);

export const IconChevronUp = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 15l6-6 6 6" />
  </Base>
);

export const IconX = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12l5 5 9-10" />
  </Base>
);

// Generic Harvard shield sigil (theme-colored), used as a fallback.
export const IconShield = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l7 2v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V5z" />
    <path d="M12 3v20M5 11h14" />
  </Base>
);

// House sigil drawn in a house's TWO identity colors (passed as data, not theme).
export function HouseSigil({
  primary,
  secondary,
  size = 28,
}: {
  primary: string;
  secondary: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3l7 2v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V5z"
        fill={primary}
        fillOpacity={0.25}
        stroke={primary}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path
        d="M12 4.5v15M5.5 11h13"
        stroke={secondary}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  );
}

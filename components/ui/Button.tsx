import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/*
  THE BUTTON.
  ------------------------------------------------------------------
  There used to be no such thing: all 259 buttons in the app were drawn from
  scratch, so the same action showed up at four heights, four corner radii, two
  font weights and five text sizes — and almost none of them reacted to a touch.

  Three variants × three sizes, and that's the whole vocabulary:

    primary    the ONE thing you can commit to on this screen
    secondary  the alternative next to it (Share, Cancel, Back)
    quiet      a small text action that shouldn't compete (Edit answers)
    muted      a way OUT rather than an action (Skip, Not now, Dismiss)
    dangerSoft destructive, before you've confirmed it
    danger     destructive, confirmed — the filled red

    lg  48px   the screen's main action, usually full width
    md  40px   inside a card or a sheet's footer
    sm  32px   a pill in a row of them

  Press feedback, the 44px touch minimum, the focus ring and the disabled state
  are built in, so they can't be forgotten. Colours come from tokens only, so a
  new university re-skins every button in the app by changing data.

  Use <Button> for something that DOES a thing and <ButtonLink> for something
  that GOES somewhere — the shapes are identical, the semantics aren't.
*/

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "quiet"
  | "muted"
  | "danger"
  | "dangerSoft";
export type ButtonSize = "lg" | "md" | "sm";

const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold press disabled:pointer-events-none disabled:opacity-40";

const variants: Record<ButtonVariant, string> = {
  // `primary-live` rather than `primary`: see lib/themes.ts — the brand crimson
  // is too dark against a near-black page to read as a raised control.
  primary: "bg-primary-live text-primary-contrast",
  secondary: "border border-border bg-surface-2 text-text",
  quiet: "text-primary-live",
  muted: "text-muted",
  danger: "bg-danger text-primary-contrast",
  // Destructive, but not yet confirmed — reads as dangerous without claiming the
  // screen's main action. The filled `danger` is what the confirmation gets.
  dangerSoft: "border border-border bg-surface-2 text-danger",
};

const sizes: Record<ButtonSize, string> = {
  lg: "h-12 rounded-xl px-5 text-[15px]",
  md: "h-10 rounded-xl px-4 text-[13px]",
  sm: "h-8 rounded-full px-3.5 text-[12px]",
};

/*
  The class string on its own, for the handful of controls that can't be a
  <button> or a <Link> — a <label> wrapping a file input, for instance. Prefer
  the components; reach for this only when the element is forced on you.
*/
export function buttonClass({
  variant = "primary",
  size = "md",
  full = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  className?: string;
} = {}) {
  return [base, variants[variant], sizes[size], full ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
}

type Shape = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  children: ReactNode;
};

export default function Button({
  variant,
  size,
  full,
  className,
  children,
  type = "button",
  ...rest
}: Shape & Omit<ComponentProps<"button">, "children">) {
  return (
    <button type={type} className={buttonClass({ variant, size, full, className })} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  full,
  className,
  children,
  ...rest
}: Shape & Omit<ComponentProps<typeof Link>, "children">) {
  return (
    <Link className={buttonClass({ variant, size, full, className })} {...rest}>
      {children}
    </Link>
  );
}

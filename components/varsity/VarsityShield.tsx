/*
  The Varsity Mode mark: a shield with the "oar" bars, outlined in gold. Colors
  are pulled from the theme variables (primary = crimson, primary-contrast =
  white, accent = gold) so it re-skins with the theme and never hardcodes hex
  (rule 1).

  Default: crimson shield + white oar bars (use on light surfaces).
  `onPrimary`: flipped to a white shield + crimson oar bars, so it stays visible
  when it sits ON the crimson top bar (the gocrimson.com white-shield look).
*/
export default function VarsityShield({
  size = 26,
  onPrimary = false,
}: {
  size?: number;
  onPrimary?: boolean;
}) {
  const shield = onPrimary ? "var(--primary-contrast)" : "var(--primary)";
  const bars = onPrimary ? "var(--primary)" : "var(--primary-contrast)";
  return (
    <svg
      width={(size * 22) / 26}
      height={size}
      viewBox="0 0 22 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M1,1 L21,1 L21,15 Q21,24 11,25 Q1,24 1,15 Z"
        fill={shield}
        stroke="var(--accent)"
        strokeWidth="1"
      />
      {/* Two oar blades crossed over a bar */}
      <rect x="4" y="4" width="5" height="16" rx="1" fill={bars} />
      <rect x="4" y="11" width="14" height="4" rx="1" fill={bars} />
      <rect x="13" y="4" width="5" height="16" rx="1" fill={bars} />
    </svg>
  );
}

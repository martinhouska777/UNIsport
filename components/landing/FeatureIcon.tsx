/*
  The small line icons beside the feature rows. Named in the data
  (lib/landingCopy.ts, `icon`), drawn here — 24×24, one stroke weight,
  currentColor so they take the row's accent.
*/
const PATHS: Record<string, string> = {
  gym: "M6 7v10M18 7v10M2 10v4M22 10v4M6 12h12M4 9v6M20 9v6",
  partners: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 1 0-1-5.8M22 21c0-3-2-5-5-5",
  chat: "M4 5h16v11H9l-5 4z",
  log: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  verified: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5",
  leaderboard: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  channels: "M10 3L8 21M16 3l-2 18M4 9h17M3 15h17",
  plan: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  boat: "M3 14c3 4 15 4 18 0l-2 4H5zM8 14V8M12 14V6M16 14V8",
  race: "M5 21V4M5 4h11l-2 4 2 4H5",
  logplan: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v8M8 12h8",
  calendar: "M4 6h16v14H4zM4 10h16M8 14h.01M12 14h.01M16 14h.01M8 3v4M16 3v4",
  squad: "M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5M12 20c0-3 2-5 4-5s6 2 6 5",
  lock: "M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4",
};

export default function FeatureIcon({ name, className = "" }: { name: string; className?: string }) {
  const d = PATHS[name] || PATHS.log;
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

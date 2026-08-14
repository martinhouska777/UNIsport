/*
  MATCH CONFIDENCE TIERS

  The matching RPCs score a candidate out of 100 (92 for session search) by
  summing partial credit for gym overlap, experience level, schedule and
  training style. Real scores land low — the best match in a young app with
  sparse profiles is around a third of the theoretical maximum, because nobody
  overlaps on everything.

  Shown as a raw percentage that reads as failure: "33%" next to someone's face
  says "bad match", when it actually means "the best available partner for you".
  So we show a qualitative tier instead, and hide candidates too weak to be
  worth a message at all.

  Thresholds live here as DATA — tune them as the user base grows and scores
  climb, without touching a component.
*/
export type MatchTierKey = "strong" | "good" | "maybe";
export type MatchTier = { key: MatchTierKey; label: string };

const TIERS: { key: MatchTierKey; label: string; minPercent: number }[] = [
  { key: "strong", label: "Strong fit", minPercent: 45 },
  { key: "good", label: "Good fit", minPercent: 28 },
  { key: "maybe", label: "Worth a try", minPercent: 15 },
];

/** The only fit labels the app emits — used to validate one arriving in a URL. */
export const MATCH_TIER_LABELS: string[] = TIERS.map((t) => t.label);

/** Raw percentage of the maximum achievable score. */
export function matchPercent(score: number, max: number): number {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

/**
 * The tier a candidate falls into, or `null` when they're below the weakest
 * tier — those should not be rendered at all.
 */
export function matchTier(score: number, max: number): MatchTier | null {
  const percent = matchPercent(score, max);
  const tier = TIERS.find((t) => percent >= t.minPercent);
  return tier ? { key: tier.key, label: tier.label } : null;
}

/** True when a candidate is worth showing. */
export function isWorthShowing(score: number, max: number): boolean {
  return matchTier(score, max) !== null;
}

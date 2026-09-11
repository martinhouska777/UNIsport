/*
  A FIRST-YEAR'S TEAM — the entry-year cohort, as DATA.
  ---------------------------------------------------------------------------
  An upperclassman has a house: a crest, two colours, a row on the board, a
  tint on every avatar. A first-year lives in a Yard dorm and had none of
  that — no crest, no colours, dashes where a house would be. This file gives
  the entry-year cohort its own identity so a first-year is on a team from
  day one.

  HOW A SCHOOL GROUPS ITS FIRST-YEARS IS DATA. Harvard's Yard dorms are too
  small and too many to be teams, so Harvard groups by CLASS YEAR: every '30
  is on one team, "Class of 2030", in the Yard's colours. A school whose
  first-years live in entryways or first-year colleges sets `groupBy:
  "residence"` and the residence becomes the team, with its own colours.
  Adding a school = adding an entry here (rule 2: data, not code).

  The colours are per-entity CONTENT colours, like a house's, applied inline
  and never hardcoded in a component (rule 1's exception).
*/
import { houseColorsFor, type HouseColors } from "@/lib/gyms";
import {
  freshmanClassYear,
  residenceKind,
  residenceLabel,
  FIRST_YEAR_OWN_YEAR_DAYS,
} from "@/lib/onboarding";
import { classOfLabel } from "@/lib/currentUser";

export type FirstYearCohortRule = {
  /** What a first-year's team IS: everyone in their class year, or their residence. */
  groupBy: "classYear" | "residence";
  /** The team's name — "Class of 2030" for a year, the residence's label otherwise. */
  name: (classYear: string, residence: string) => string;
  /** The team's two identity colours. */
  colors: HouseColors;
};

export const firstYearCohorts: Record<string, FirstYearCohortRule> = {
  // The Yard: a deep blue-grey (the Yard's iron gates and slate) with the
  // Yard's gold — deliberately not crimson, which is the SCHOOL's, and not any
  // house's pair, so a first-year reads as their own team.
  harvard: {
    groupBy: "classYear",
    name: (classYear) => classOfLabel(classYear),
    colors: { primary: "#3b5b8c", secondary: "#c9a227" },
  },
  // Any school without its own line: first-years group by class year in a
  // neutral slate-and-gold, until somebody decides otherwise for that campus.
  default: {
    groupBy: "classYear",
    name: (classYear) => classOfLabel(classYear),
    colors: { primary: "#4a5a72", secondary: "#c9a227" },
  },
};

export function firstYearRule(universityKey: string | null | undefined): FirstYearCohortRule {
  return firstYearCohorts[universityKey ?? ""] ?? firstYearCohorts.default;
}

/*
  THE TEAM — what every screen should show instead of a house when there is
  no house. A house wins when there is one; a first-year gets their cohort;
  an upperclassman living off campus is on no team, which is honest.
*/
export type Team = {
  key: string; // the group key on the boards: a house name, a class year, a dorm
  label: string; // "Adams House" / "Class of 2030"
  colors: HouseColors;
  kind: "house" | "firstYear";
};

export function teamFor(
  universityKey: string,
  residence: string | null | undefined,
  classYear: string | null | undefined,
): Team | null {
  const house = houseColorsFor(universityKey, residence);
  if (house && residence) {
    return { key: residence, label: residenceLabel(residence), colors: house, kind: "house" };
  }
  if (classYear && classYear === freshmanClassYear) {
    const rule = firstYearRule(universityKey);
    const key = rule.groupBy === "residence" && residence ? residence : classYear;
    return {
      key,
      label: rule.name(classYear, residence ?? ""),
      colors: rule.colors,
      kind: "firstYear",
    };
  }
  return null;
}

/*
  IS THIS A NEW FIRST-YEAR? — someone in the entering class whose account is
  younger than FIRST_YEAR_OWN_YEAR_DAYS. Their Match opens on their own year.
  `now` is passed in so callers rendering in React stay pure.
*/
export function isNewFirstYear(
  classYear: string | null | undefined,
  signedUpAt: string | null | undefined,
  now: number,
): boolean {
  if (classYear !== freshmanClassYear || !signedUpAt) return false;
  const days = (now - new Date(signedUpAt).getTime()) / 86400000;
  return days >= 0 && days <= FIRST_YEAR_OWN_YEAR_DAYS;
}

/** The colours for a first-year dorm on a board — the cohort's, since a dorm has none of its own. */
export function dormColors(key: string | null | undefined, universityKey = "harvard"): HouseColors | null {
  if (!key || residenceKind(key) !== "dorm") return null;
  return firstYearRule(universityKey).colors;
}

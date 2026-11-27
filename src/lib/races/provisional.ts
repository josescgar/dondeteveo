import type { RaceProvisional } from "./schemas";

export const PROVISIONAL_FACTS = ["route", "startTime"] as const;

export type ProvisionalFact = (typeof PROVISIONAL_FACTS)[number];

/**
 * Returns the facts of an edition that are still pending confirmation, in a
 * stable display order. Editions without a `provisional` field return `[]`.
 */
export const getProvisionalFacts = (
  provisional: RaceProvisional | undefined,
): ProvisionalFact[] =>
  PROVISIONAL_FACTS.filter((fact) => provisional?.[fact] === true);

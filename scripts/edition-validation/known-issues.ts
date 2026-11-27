import { CHECK_IDS, type KnownIssue } from "./edition-validation.logic.ts";

/**
 * Problems in committed editions that are accepted for now. Each entry turns
 * the matching error into a warning, so it stays visible without failing CI.
 * Fix the data and delete the entry; the validator warns when an entry no
 * longer reproduces. Do not add entries to get a new edition through.
 */
export const KNOWN_ISSUES: readonly KnownIssue[] = [
  {
    edition: "es/media-maraton-malaga/2026",
    checkId: CHECK_IDS.routeLength,
    reason:
      "pre-existing plotaroute.com trace measures ~21.81 km (+3.4%); re-import from an official GPX when available",
  },
];

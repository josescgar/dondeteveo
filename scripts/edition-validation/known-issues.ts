import { CHECK_IDS, type KnownIssue } from "./edition-validation.logic.ts";

/**
 * Accepted, bounded exceptions for committed editions. Each entry lets one
 * edition fail one check up to the looser limits in `options`; within them the
 * errors are reported as warnings, beyond them they are errors again. Past
 * editions are preserved as published, so exceptions for them are permanent.
 * Do not add entries to get a new edition through.
 */
export const KNOWN_ISSUES: readonly KnownIssue[] = [
  {
    edition: "es/media-maraton-malaga/2026",
    checkId: CHECK_IDS.routeLength,
    options: { lengthTolerancePercent: 3.5 },
    reason:
      "permanent exception for a past edition preserved as published: its plotaroute.com trace measures 21.810 km (+3.38%)",
  },
];

import { z } from "zod";

/**
 * Schemas for the race watchlist and discovery sources registry under
 * `watchlist/`. The registry is internal tooling state for race sourcing
 * (read and updated by agents and maintainers). It must never be imported by
 * pages, layouts, components or islands, so it never reaches the site bundle.
 */

export const CATALOG_STATUSES = ["in-catalog", "candidate"] as const;

export const TRACK_SOURCE_TYPES = [
  "official-gpx",
  "official-kml",
  "google-my-maps",
  "strava-route",
  "wikiloc",
  "manual-trace",
  "other",
  "none",
] as const;

const isoDateSchema = z.iso.date();
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const countryCodeSchema = z.string().regex(/^[a-z]{2}$/);

const waveSchema = z.object({
  label: z.string().min(1),
  startTime: timeSchema,
});

/**
 * One last-known fact about the next edition. `value` is `null` while the fact
 * is unknown. A known value must say where it was read and when, so a later
 * run can re-check the same page and detect changes. An unknown value may
 * still carry `sourceUrl` and `checkedOn` to record that a page was checked
 * and the fact was not published yet.
 */
const factSchema = <T extends z.ZodType>(valueSchema: T) =>
  z
    .object({
      value: valueSchema.nullable(),
      sourceUrl: z.url().nullable(),
      checkedOn: isoDateSchema.nullable(),
    })
    .strict();

const FACT_KEYS = ["date", "startTime", "waves", "routeConfirmed"] as const;

export const nextEditionSchema = z
  .object({
    year: z.number().int().min(2000).max(2100).nullable(),
    date: factSchema(isoDateSchema),
    startTime: factSchema(timeSchema),
    waves: factSchema(z.array(waveSchema).min(2)),
    routeConfirmed: factSchema(z.boolean()),
  })
  .strict()
  .superRefine((edition, context) => {
    for (const key of FACT_KEYS) {
      const fact = edition[key];
      if (
        fact.value !== null &&
        (fact.sourceUrl === null || fact.checkedOn === null)
      ) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "A known fact needs sourceUrl and checkedOn",
        });
      }
    }
    if (
      edition.date.value !== null &&
      (edition.year === null ||
        !edition.date.value.startsWith(`${edition.year}-`))
    ) {
      context.addIssue({
        code: "custom",
        path: ["date"],
        message: "nextEdition.date must fall in nextEdition.year",
      });
    }
  });

export const trackSourceSchema = z
  .object({
    type: z.enum(TRACK_SOURCE_TYPES),
    url: z.url().nullable(),
    loginRequired: z.boolean().nullable(),
    checkedOn: isoDateSchema.nullable(),
    notes: z.string().min(1),
  })
  .strict()
  .refine((source) => source.type !== "none" || source.url === null, {
    message: 'A track source of type "none" cannot have a URL',
  });

export const watchedRaceSchema = z
  .object({
    slug: slugSchema,
    countryCode: countryCodeSchema,
    name: z.string().min(1),
    city: z.string().min(1),
    distanceKm: z.number().positive(),
    catalogStatus: z.enum(CATALOG_STATUSES),
    trackingIssue: z.number().int().positive().nullable(),
    usualMonth: z.number().int().min(1).max(12).nullable(),
    officialWebsiteUrl: z.url(),
    coursePageUrl: z.url().nullable(),
    regulationsUrl: z.url().nullable(),
    trackSource: trackSourceSchema,
    nextEdition: nextEditionSchema,
    notes: z.string().min(1).optional(),
  })
  .strict();

export const discoverySourceSchema = z
  .object({
    id: slugSchema,
    name: z.string().min(1),
    url: z.url(),
    countryCode: countryCodeSchema,
    coverage: z.string().min(1),
    howToRead: z.string().min(1),
    verifiedOn: isoDateSchema,
  })
  .strict();

export const discoverySourcesFileSchema = z
  .object({
    sources: z.array(discoverySourceSchema).min(1),
  })
  .strict()
  .refine(
    (file) =>
      new Set(file.sources.map((source) => source.id)).size ===
      file.sources.length,
    { message: "Discovery source ids must be unique" },
  );

export type CatalogStatus = (typeof CATALOG_STATUSES)[number];
export type TrackSourceType = (typeof TRACK_SOURCE_TYPES)[number];
export type WatchedRace = z.infer<typeof watchedRaceSchema>;
export type DiscoverySource = z.infer<typeof discoverySourceSchema>;

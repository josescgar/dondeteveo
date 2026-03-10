import { z } from "zod";

export const metaSchema = z.object({
  name: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  distanceKm: z.number().positive(),
  city: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1),
  officialWebsiteUrl: z.string().url(),
  summary: z.string().min(1),
  heroNote: z.string().min(1),
  specialNote: z.string().min(1).optional(),
});

export const sourceSchema = z.object({
  officialSourceName: z.string().min(1),
  officialSourceUrl: z.string().url(),
  routeSourceType: z.enum(["manual-trace", "gpx-import", "kml-import"]),
  notes: z.string().min(1),
});

export const pointPropertiesSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["split", "cheer-point"]),
  distanceKm: z.number().min(0),
});

export const routeFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z
    .array(
      z.object({
        type: z.literal("Feature"),
        properties: z.record(z.unknown()),
        geometry: z.object({
          type: z.literal("LineString"),
          coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
        }),
      }),
    )
    .min(1),
});

export const pointsFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z
    .array(
      z.object({
        type: z.literal("Feature"),
        properties: pointPropertiesSchema,
        geometry: z.object({
          type: z.literal("Point"),
          coordinates: z.tuple([z.number(), z.number()]),
        }),
      }),
    )
    .min(1),
});

export type RaceMeta = z.infer<typeof metaSchema>;
export type RaceSource = z.infer<typeof sourceSchema>;
export type RacePointFeature = z.infer<
  typeof pointsFeatureCollectionSchema
>["features"][number];
export type RaceRouteCollection = z.infer<typeof routeFeatureCollectionSchema>;
export type RacePointsCollection = z.infer<
  typeof pointsFeatureCollectionSchema
>;

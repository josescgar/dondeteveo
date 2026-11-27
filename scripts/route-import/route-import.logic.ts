import {
  pointsFeatureCollectionSchema,
  routeFeatureCollectionSchema,
  type RacePointsCollection,
  type RaceRouteCollection,
} from "../../src/lib/races/schemas.ts";
import {
  haversineKm,
  isValidPosition,
  lineLengthKm,
  positionAlongLine,
  roundPosition,
  roundTo,
  type Position,
} from "../lib/geo.ts";
import {
  findChild,
  findChildren,
  parseXml,
  type XmlElement,
} from "../lib/xml.ts";

export const ROUTE_FORMATS = ["gpx", "kml"] as const;
export type RouteFormat = (typeof ROUTE_FORMATS)[number];

export const ROUTE_SOURCE_TYPES: Record<RouteFormat, string> = {
  gpx: "gpx-import",
  kml: "kml-import",
};

export const DEFAULT_SPLIT_INTERVAL_KM = 5;
/** Largest gap between consecutive segments that are still joined. */
export const DEFAULT_MAX_JOIN_GAP_KM = 0.25;
export const MARATHON_DISTANCE_KM = 42.195;
const MARATHON_DISTANCE_TOLERANCE_KM = 0.1;
/** Decimals kept for generated `distanceKm` values (e.g. `21.0975`). */
const POINT_DISTANCE_DECIMALS = 4;
const DISTANCE_EPSILON_KM = 1e-9;
const PERCENT = 100;

export const SPLIT_IDS = {
  start: "start",
  finish: "finish",
  halfway: "halfway",
} as const;

export const SPLIT_LABELS = {
  start: "Start",
  finish: "Finish",
  halfway: "Halfway split",
} as const;

export class RouteImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteImportError";
  }
}

/** One candidate line found in a source file, before joining. */
export type SourceLine = {
  /** Human-readable description used in error messages. */
  label: string;
  coordinates: Position[];
};

export const detectRouteFormat = (
  fileName: string,
  content: string,
): RouteFormat => {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "kmz") {
    throw new RouteImportError(
      "KMZ files are zipped KML. Extract the KML first (for example `unzip -p route.kmz doc.kml > route.kml`) and import that file.",
    );
  }
  if (extension === "gpx" || extension === "kml") {
    return extension;
  }
  if (/<gpx[\s>]/.test(content)) {
    return "gpx";
  }
  if (/<kml[\s>]/.test(content)) {
    return "kml";
  }
  throw new RouteImportError(
    `Cannot tell whether "${fileName}" is GPX or KML. Use a .gpx or .kml file.`,
  );
};

const parseNumber = (value: string | undefined): number =>
  value === undefined || value.trim() === "" ? Number.NaN : Number(value);

const requirePosition = (position: Position, context: string): Position => {
  if (!isValidPosition(position)) {
    throw new RouteImportError(`Invalid coordinate in ${context}.`);
  }
  return position;
};

const elementName = (element: XmlElement): string | undefined => {
  const name = findChild(element, "name")?.text.trim();
  return name ? name : undefined;
};

const describe = (kind: string, index: number, name?: string): string =>
  name ? `${kind} ${index} "${name}"` : `${kind} ${index}`;

const gpxPoints = (
  container: XmlElement,
  pointName: string,
  context: string,
): Position[] =>
  findChildren(container, pointName).map((point, index) =>
    requirePosition(
      [parseNumber(point.attributes.lon), parseNumber(point.attributes.lat)],
      `${context}, point ${index + 1}`,
    ),
  );

/** GPX tracks (one line per `trkseg`) and routes, in document order. */
export const extractGpxLines = (root: XmlElement): SourceLine[] => {
  if (root.name !== "gpx") {
    throw new RouteImportError("Not a GPX document: missing <gpx> root.");
  }
  const lines: SourceLine[] = [];
  findChildren(root, "trk").forEach((track, trackIndex) => {
    const trackLabel = describe("track", trackIndex + 1, elementName(track));
    findChildren(track, "trkseg").forEach((segment, segmentIndex) => {
      const label = `${trackLabel} segment ${segmentIndex + 1}`;
      lines.push({ label, coordinates: gpxPoints(segment, "trkpt", label) });
    });
  });
  findChildren(root, "rte").forEach((route, routeIndex) => {
    const label = describe("route", routeIndex + 1, elementName(route));
    lines.push({ label, coordinates: gpxPoints(route, "rtept", label) });
  });
  return lines;
};

const parseKmlTuple = (tuple: string, separator: RegExp): Position => {
  const [longitude, latitude] = tuple.split(separator).map(parseNumber);
  return [longitude, latitude];
};

/** Parses a KML `<coordinates>` body: `lon,lat[,alt]` tuples. */
export const parseKmlCoordinates = (
  text: string,
  context: string,
): Position[] =>
  text
    .trim()
    .split(/\s+/)
    .filter((tuple) => tuple.length > 0)
    .map((tuple, index) =>
      requirePosition(
        parseKmlTuple(tuple, /,/),
        `${context}, coordinate ${index + 1}`,
      ),
    );

/** KML `LineString` and `gx:Track` geometries, in document order. */
export const extractKmlLines = (root: XmlElement): SourceLine[] => {
  if (root.name !== "kml") {
    throw new RouteImportError("Not a KML document: missing <kml> root.");
  }
  const lines: SourceLine[] = [];
  const visit = (element: XmlElement, placemarkName?: string): void => {
    const name =
      element.name === "Placemark"
        ? (elementName(element) ?? placemarkName)
        : placemarkName;
    if (element.name === "LineString") {
      const label = describe("LineString", lines.length + 1, name);
      lines.push({
        label,
        coordinates: parseKmlCoordinates(
          findChild(element, "coordinates")?.text ?? "",
          label,
        ),
      });
      return;
    }
    if (element.name === "Track") {
      const label = describe("gx:Track", lines.length + 1, name);
      lines.push({
        label,
        coordinates: findChildren(element, "coord").map((coord, index) =>
          requirePosition(
            parseKmlTuple(coord.text.trim(), /\s+/),
            `${label}, coordinate ${index + 1}`,
          ),
        ),
      });
      return;
    }
    element.children.forEach((child) => visit(child, name));
  };
  visit(root);
  return lines;
};

export const extractLines = (
  format: RouteFormat,
  content: string,
): SourceLine[] => {
  const root = parseXml(content);
  return format === "gpx" ? extractGpxLines(root) : extractKmlLines(root);
};

export type LineSelectionOptions = {
  /** 1-based index of the line to use when a file has several. */
  lineIndex?: number;
  maxJoinGapKm?: number;
};

export type LineSelection = {
  coordinates: Position[];
  /** Labels of the source lines used, in order. */
  usedLines: string[];
};

const summarizeLines = (lines: SourceLine[]): string =>
  lines
    .map(
      (line, index) =>
        `  ${index + 1}. ${line.label}: ${line.coordinates.length} points, ${lineLengthKm(line.coordinates).toFixed(3)} km`,
    )
    .join("\n");

/**
 * Picks the route line. A single line is used as is; several lines are joined
 * in document order when each one starts where the previous one ended
 * (within `maxJoinGapKm`). Anything else is ambiguous and rejected.
 */
export const selectRouteLine = (
  lines: SourceLine[],
  {
    lineIndex,
    maxJoinGapKm = DEFAULT_MAX_JOIN_GAP_KM,
  }: LineSelectionOptions = {},
): LineSelection => {
  const usable = lines.filter((line) => line.coordinates.length >= 2);
  if (usable.length === 0) {
    throw new RouteImportError(
      "No usable line found: the file needs a GPX track or route, or a KML LineString, with at least two points.",
    );
  }

  if (lineIndex !== undefined) {
    const line = usable[lineIndex - 1];
    if (!Number.isInteger(lineIndex) || !line) {
      throw new RouteImportError(
        `--line ${lineIndex} is out of range. Usable lines:\n${summarizeLines(usable)}`,
      );
    }
    return { coordinates: [...line.coordinates], usedLines: [line.label] };
  }

  if (usable.length === 1) {
    return {
      coordinates: [...usable[0].coordinates],
      usedLines: [usable[0].label],
    };
  }

  const gaps = usable.slice(1).map((line, offset) => ({
    from: usable[offset],
    to: line,
    gapKm: haversineKm(
      usable[offset].coordinates[usable[offset].coordinates.length - 1],
      line.coordinates[0],
    ),
  }));
  const brokenGaps = gaps.filter((gap) => gap.gapKm > maxJoinGapKm);
  if (brokenGaps.length > 0) {
    const gapDescriptions = brokenGaps
      .map(
        (gap) =>
          `  ${gap.from.label} ends ${gap.gapKm.toFixed(3)} km from the start of ${gap.to.label}`,
      )
      .join("\n");
    throw new RouteImportError(
      `The file contains ${usable.length} lines that do not join end to start (max gap ${maxJoinGapKm} km):\n${gapDescriptions}\nLines found:\n${summarizeLines(usable)}\nPick one with --line <n>, or raise --max-join-gap-km if the segments belong together.`,
    );
  }

  return {
    coordinates: usable.flatMap((line) => line.coordinates),
    usedLines: usable.map((line) => line.label),
  };
};

/** Rounds to six decimals and drops consecutive duplicate positions. */
export const cleanCoordinates = (coordinates: Position[]): Position[] => {
  const cleaned: Position[] = [];
  for (const coordinate of coordinates) {
    const rounded = roundPosition(coordinate);
    const previous = cleaned[cleaned.length - 1];
    if (!previous || previous[0] !== rounded[0] || previous[1] !== rounded[1]) {
      cleaned.push(rounded);
    }
  }
  return cleaned;
};

export type PlannedPoint = {
  id: string;
  label: string;
  distanceKm: number;
};

export const isMarathonDistance = (distanceKm: number): boolean =>
  Math.abs(distanceKm - MARATHON_DISTANCE_KM) <= MARATHON_DISTANCE_TOLERANCE_KM;

/** `5` -> `5`, `2.5` -> `2.5`, `7.50` -> `7.5`. */
const formatKm = (distanceKm: number): string =>
  String(roundTo(distanceKm, POINT_DISTANCE_DECIMALS));

export const splitId = (distanceKm: number): string =>
  `km-${formatKm(distanceKm).replace(".", "-")}`;

export const splitLabel = (distanceKm: number): string =>
  `${formatKm(distanceKm)}K split`;

/**
 * Start, regular splits every `splitIntervalKm`, the halfway split for
 * marathons, and finish, sorted by distance. Distances are official race
 * distances (not measured route distances).
 */
export const planSplits = (
  distanceKm: number,
  splitIntervalKm: number = DEFAULT_SPLIT_INTERVAL_KM,
): PlannedPoint[] => {
  if (!(distanceKm > 0)) {
    throw new RouteImportError("The official distance must be positive.");
  }
  if (!(splitIntervalKm > 0)) {
    throw new RouteImportError("The split interval must be positive.");
  }
  const planned: PlannedPoint[] = [
    { id: SPLIT_IDS.start, label: SPLIT_LABELS.start, distanceKm: 0 },
  ];
  for (
    let step = 1;
    step * splitIntervalKm < distanceKm - DISTANCE_EPSILON_KM;
    step += 1
  ) {
    const splitKm = roundTo(step * splitIntervalKm, POINT_DISTANCE_DECIMALS);
    planned.push({
      id: splitId(splitKm),
      label: splitLabel(splitKm),
      distanceKm: splitKm,
    });
  }
  if (isMarathonDistance(distanceKm)) {
    planned.push({
      id: SPLIT_IDS.halfway,
      label: SPLIT_LABELS.halfway,
      distanceKm: roundTo(distanceKm / 2, POINT_DISTANCE_DECIMALS),
    });
  }
  planned.push({
    id: SPLIT_IDS.finish,
    label: SPLIT_LABELS.finish,
    distanceKm,
  });
  return planned.sort((left, right) => left.distanceKm - right.distanceKm);
};

export type ImportRouteOptions = {
  fileName: string;
  content: string;
  /** Official race distance in km; point distances are normalised to it. */
  distanceKm: number;
  raceSlug: string;
  year: string;
  /** Race display name used for the route feature name. */
  raceName?: string;
  splitIntervalKm?: number;
} & LineSelectionOptions;

export type ImportRouteResult = {
  format: RouteFormat;
  route: RaceRouteCollection;
  points: RacePointsCollection;
  measuredKm: number;
  /** Signed difference of the measured length from the official distance. */
  differencePercent: number;
  usedLines: string[];
  sourcePointCount: number;
};

export const importRoute = ({
  fileName,
  content,
  distanceKm,
  raceSlug,
  year,
  raceName,
  splitIntervalKm,
  lineIndex,
  maxJoinGapKm,
}: ImportRouteOptions): ImportRouteResult => {
  const format = detectRouteFormat(fileName, content);
  const selection = selectRouteLine(extractLines(format, content), {
    lineIndex,
    maxJoinGapKm,
  });
  const coordinates = cleanCoordinates(selection.coordinates);
  if (coordinates.length < 2) {
    throw new RouteImportError(
      "The selected line collapses to a single position after rounding.",
    );
  }

  const measuredKm = lineLengthKm(coordinates);
  const plan = planSplits(distanceKm, splitIntervalKm);
  const toMeasuredKm = (officialKm: number): number =>
    (officialKm / distanceKm) * measuredKm;

  const route = routeFeatureCollectionSchema.parse({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          id: `${raceSlug}-${year}-route`,
          name: `${raceName ?? raceSlug} ${year} route`,
        },
        geometry: { type: "LineString", coordinates },
      },
    ],
  });

  const points = pointsFeatureCollectionSchema.parse({
    type: "FeatureCollection",
    features: plan.map((point) => ({
      type: "Feature",
      properties: {
        id: point.id,
        label: point.label,
        kind: "split",
        distanceKm: point.distanceKm,
      },
      geometry: {
        type: "Point",
        coordinates: roundPosition(
          positionAlongLine(coordinates, toMeasuredKm(point.distanceKm)),
        ),
      },
    })),
  });

  return {
    format,
    route,
    points,
    measuredKm,
    differencePercent: ((measuredKm - distanceKm) / distanceKm) * PERCENT,
    usedLines: selection.usedLines,
    sourcePointCount: selection.coordinates.length,
  };
};

const COORDINATE_PAIR_PATTERN =
  /\[\s*(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?),\s*(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*\]/gi;

/**
 * Pretty JSON in the layout the committed data uses (and Prettier keeps):
 * two-space indentation with each `[lon, lat]` pair on one line.
 */
export const serializeGeoJson = (value: unknown): string =>
  `${JSON.stringify(value, null, 2).replace(COORDINATE_PAIR_PATTERN, "[$1, $2]")}\n`;

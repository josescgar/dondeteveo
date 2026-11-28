import {
  GITHUB_REPOSITORY_URL,
  INDEXABLE_SITE_ORIGIN,
  SITE_NAME,
  type Locale,
} from "./config";
import { getDictionary } from "./i18n";
import type { RaceEdition } from "./races/catalog";
import { buildHomePath, buildRacePath, buildRacesPath } from "./routes";
import { buildCanonicalUrl, buildEditionSeoImagePath } from "./seo";

export type JsonLdNode = { [key: string]: JsonLdValue };
type JsonLdValue =
  string | number | boolean | JsonLdNode | readonly JsonLdValue[];

export type JsonLdDocument = JsonLdNode & { "@context": "https://schema.org" };

const SCHEMA_CONTEXT = "https://schema.org" as const;
const ORGANIZATION_ID = `${INDEXABLE_SITE_ORIGIN}/#organization`;
const LOGO_URL = `${INDEXABLE_SITE_ORIGIN}/logo.png`;

const escapeForScript = (character: string): string =>
  `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`;

/**
 * Serializes JSON-LD for an inline `<script type="application/ld+json">`.
 * Escapes `<`, `>` and `&` as JSON unicode escapes so race data can never
 * close the script element or inject markup (for example a raw `</script>`).
 */
export const serializeJsonLd = (document: JsonLdDocument): string =>
  JSON.stringify(document).replace(/[<>&]/g, escapeForScript);

const parseOffsetMinutes = (offsetName: string): number => {
  // `longOffset` yields "GMT" for UTC and "GMT+01:00" / "GMT-03:30" otherwise.
  const match = offsetName.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) {
    return 0;
  }
  const [, sign, hours, minutes] = match;
  const total = Number(hours) * 60 + Number(minutes);
  return sign === "-" ? -total : total;
};

const getOffsetMinutesAt = (epochMs: number, timeZone: string): number => {
  const offsetName =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    })
      .formatToParts(new Date(epochMs))
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  return parseOffsetMinutes(offsetName);
};

const formatOffset = (offsetMinutes: number): string => {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
};

/**
 * Builds an ISO 8601 local date-time with the UTC offset that the IANA
 * `timeZone` observes at that wall-clock time (DST-aware), for example
 * `2026-03-29T09:00:00+02:00` for Europe/Madrid after the spring change.
 */
export const buildZonedIsoDateTime = (
  date: string,
  time: string,
  timeZone: string,
): string => {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hours, minutes);
  // Resolve the offset in two passes so instants near a DST change use the
  // offset in force at the local wall-clock time, not at the same UTC time.
  const firstGuess = getOffsetMinutesAt(wallClockAsUtc, timeZone);
  const offsetMinutes = getOffsetMinutesAt(
    wallClockAsUtc - firstGuess * 60_000,
    timeZone,
  );
  return `${date}T${time}:00${formatOffset(offsetMinutes)}`;
};

const buildOrganizationNode = (): JsonLdNode => ({
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE_NAME,
  url: buildCanonicalUrl("/"),
  logo: LOGO_URL,
  sameAs: [GITHUB_REPOSITORY_URL],
});

export const buildHomeStructuredData = (locale: Locale): JsonLdDocument => {
  const dictionary = getDictionary(locale);
  const homeUrl = buildCanonicalUrl(buildHomePath(locale));

  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${homeUrl}#website`,
        name: SITE_NAME,
        url: homeUrl,
        description: dictionary.homeSeoDescription,
        inLanguage: locale,
        publisher: { "@id": ORGANIZATION_ID },
      },
      buildOrganizationNode(),
    ],
  };
};

/**
 * `edition` must already be localized for `locale` so the name, city and
 * description match the visible page.
 */
export const buildEditionStructuredData = (
  locale: Locale,
  edition: RaceEdition,
): JsonLdDocument[] => {
  const dictionary = getDictionary(locale);
  const { meta, raceSlug, year, countryCode } = edition;
  const editionName = `${meta.name} ${year}`;
  const editionUrl = buildCanonicalUrl(buildRacePath(locale, raceSlug, year));

  const sportsEvent: JsonLdDocument = {
    "@context": SCHEMA_CONTEXT,
    "@type": "SportsEvent",
    name: editionName,
    startDate: buildZonedIsoDateTime(meta.date, meta.startTime, meta.timezone),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: meta.city,
      address: {
        "@type": "PostalAddress",
        addressLocality: meta.city,
        addressCountry: countryCode.toUpperCase(),
      },
    },
    url: editionUrl,
    image: buildCanonicalUrl(buildEditionSeoImagePath(locale, raceSlug, year)),
    description: meta.summary,
    inLanguage: locale,
    sameAs: meta.officialWebsiteUrl,
  };

  const breadcrumbs: JsonLdDocument = {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: SITE_NAME, url: buildCanonicalUrl(buildHomePath(locale)) },
      {
        name: dictionary.raceDiscovery,
        url: buildCanonicalUrl(buildRacesPath(locale)),
      },
      { name: editionName, url: editionUrl },
    ].map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };

  return [sportsEvent, breadcrumbs];
};

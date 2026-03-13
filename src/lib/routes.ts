import type { Locale } from "./config";

export const ROUTE_SEGMENTS = {
  races: "races",
  share: "share",
  about: "about",
  privacy: "privacy",
  contribute: "contribute",
  og: "og",
} as const;

export const buildHomePath = (locale: Locale): string => `/${locale}`;

export const buildRacesPath = (locale: Locale): string =>
  `/${locale}/${ROUTE_SEGMENTS.races}`;

export const buildRacePath = (
  locale: Locale,
  raceSlug: string,
  year?: string,
): string =>
  year
    ? `/${locale}/${ROUTE_SEGMENTS.races}/${raceSlug}/${year}`
    : `/${locale}/${ROUTE_SEGMENTS.races}/${raceSlug}`;

export const buildSharePath = (
  locale: Locale,
  raceSlug: string,
  year: string,
): string => `/${locale}/${ROUTE_SEGMENTS.share}/${raceSlug}/${year}`;

export const buildAboutPath = (locale: Locale): string =>
  `/${locale}/${ROUTE_SEGMENTS.about}`;

export const buildPrivacyPath = (locale: Locale): string =>
  `/${locale}/${ROUTE_SEGMENTS.privacy}`;

export const buildContributePath = (locale: Locale): string =>
  `/${locale}/${ROUTE_SEGMENTS.contribute}`;

export const switchLocalePath = (pathname: string, locale: Locale): string =>
  pathname.replace(/^\/(en|es)/, `/${locale}`);

export const EDITION_PATH_PATTERN = new RegExp(
  `^\\/(en|es)\\/(?:${ROUTE_SEGMENTS.races}|${ROUTE_SEGMENTS.share})\\/([^/]+)\\/([^/]+)$`,
);

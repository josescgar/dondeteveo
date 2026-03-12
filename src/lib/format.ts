import type { Locale } from "./config";

const DATE_FORMATTERS: Record<Locale, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
  es: new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
};

const REGION_DISPLAY_NAMES: Record<Locale, Intl.DisplayNames> = {
  en: new Intl.DisplayNames(["en-GB"], { type: "region" }),
  es: new Intl.DisplayNames(["es-ES"], { type: "region" }),
};

export const formatRaceDate = (date: string, locale: Locale): string =>
  DATE_FORMATTERS[locale].format(new Date(`${date}T00:00:00`));

export const formatDistance = (distanceKm: number, locale: Locale): string => {
  const number = new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", {
    maximumFractionDigits: 1,
  }).format(distanceKm);

  return `${number} km`;
};

export const formatCountryName = (
  countryCode: string,
  locale: Locale,
): string => {
  const normalizedCountryCode = countryCode.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
    return normalizedCountryCode;
  }

  return (
    REGION_DISPLAY_NAMES[locale].of(normalizedCountryCode) ??
    normalizedCountryCode
  );
};

export const getTodayInTimeZone = (
  timeZone: string,
  referenceDate = new Date(),
): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referenceDate);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Could not format date for timezone: ${timeZone}`);
  }

  return `${year}-${month}-${day}`;
};

export const buildRacePath = (
  locale: Locale,
  raceSlug: string,
  year?: string,
): string =>
  year
    ? `/${locale}/races/${raceSlug}/${year}`
    : `/${locale}/races/${raceSlug}`;

export const buildSharePath = (
  locale: Locale,
  raceSlug: string,
  year: string,
): string => `/${locale}/share/${raceSlug}/${year}`;

export const switchLocalePath = (pathname: string, locale: Locale): string =>
  pathname.replace(/^\/(en|es)/, `/${locale}`);

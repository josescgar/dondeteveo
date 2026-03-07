export const SUPPORTED_LOCALES = ["en", "es"] as const;
export const DEFAULT_LOCALE = "en";
export const INDEXABLE_SITE_ORIGIN = "https://dondeteveo.com";
export const ROOT_REDIRECT_DELAY_MS = 10;
export const REQUIRED_CHECK_NAMES = [
  "quality",
  "e2e-smoke",
  "visual-regression",
] as const;
export const MAP_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
export const MAP_ATTRIBUTION = "&copy; OpenStreetMap contributors &copy; CARTO";

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Espanol",
};

export const LOCALE_ALTERNATES: Record<Locale, Locale> = {
  en: "es",
  es: "en",
};

export const SHARE_FRAGMENT_KEYS = {
  mode: "mode",
  value: "value",
  name: "name",
} as const;

export const SUPPORTED_LOCALES = ["en", "es"] as const;
export const DEFAULT_LOCALE = "es";
export const INDEXABLE_SITE_ORIGIN = "https://dondeteveo.com";
export const SITE_NAME = "Dondeteveo";
export const SEO_IMAGE_WIDTH = 1200;
export const SEO_IMAGE_HEIGHT = 630;
export const GITHUB_REPOSITORY_URL = "https://github.com/josescgar/dondeteveo";
export const REQUIRED_CHECK_NAMES = [
  "quality",
  "e2e-smoke",
  "visual-regression",
] as const;
// CARTO Positron ("light_all") raster tiles, in the Leaflet form documented at
// https://carto.com/basemaps/ . CARTO requires `?key=` on every tile URL.
export const CARTO_LIGHT_TILE_URL =
  "https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png";
export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attribution/">CARTO</a>';
// Standard OpenStreetMap tiles, used when no CARTO key is configured. Single
// host, no retina suffix: https://operations.osmfoundation.org/policies/tiles/
export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const DISCOVERY_PAGE_SIZE = 12;
export const THEME_STORAGE_KEY = "dtv-theme";

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Espanol",
};

export const LOCALE_ALTERNATES: Record<Locale, Locale> = {
  en: "es",
  es: "en",
};

export const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
  en: "en_US",
  es: "es_ES",
};

export const LOCALE_STORAGE_KEY = "dtv-locale";

export const CONTACT_EMAIL = "jose.escobar.dev@gmail.com";
export const CONTRIBUTING_URL = `${GITHUB_REPOSITORY_URL}/blob/main/CONTRIBUTING.md`;
export const NEW_ISSUE_URL = `${GITHUB_REPOSITORY_URL}/issues/new`;

export const SHARE_FRAGMENT_KEYS = {
  mode: "mode",
  value: "value",
  name: "name",
  wave: "wave",
} as const;

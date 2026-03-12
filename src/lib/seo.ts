import {
  INDEXABLE_SITE_ORIGIN,
  LOCALE_ALTERNATES,
  OPEN_GRAPH_LOCALES,
  SEO_IMAGE_HEIGHT,
  SEO_IMAGE_WIDTH,
  SITE_NAME,
  type Locale,
} from "./config";

export type SeoImage = {
  url: string;
  alt: string;
  width: number;
  height: number;
};

export type SeoInput = {
  title: string;
  description: string;
  locale: Locale;
  pathname: string;
  noindex?: boolean;
  imagePath?: string;
  imageAlt?: string;
  ogType?: "website";
};

type SeoAlternate = {
  hrefLang: Locale;
  href: string;
};

type SeoOutput = SeoInput & {
  canonical: string;
  alternates: SeoAlternate[];
  openGraph: {
    title: string;
    description: string;
    url: string;
    type: "website";
    siteName: string;
    locale: string;
    image: SeoImage;
  };
  twitter: {
    card: "summary_large_image";
    title: string;
    description: string;
    image: SeoImage;
  };
};

export const buildCanonicalUrl = (pathname: string): string =>
  new URL(pathname, INDEXABLE_SITE_ORIGIN).toString();

export const buildAlternateUrl = (locale: Locale, pathname: string): string => {
  const pathWithoutLocale = pathname.replace(/^\/(en|es)/, "");
  return buildCanonicalUrl(`/${locale}${pathWithoutLocale}`);
};

export const buildAlternates = (locale: Locale, pathname: string) => [
  { hrefLang: locale, href: buildCanonicalUrl(pathname) },
  {
    hrefLang: LOCALE_ALTERNATES[locale],
    href: buildAlternateUrl(LOCALE_ALTERNATES[locale], pathname),
  },
];

export const buildDefaultSeoImagePath = (locale: Locale): string =>
  `/og/${locale}/default.png`;

export const buildEditionSeoImagePath = (
  locale: Locale,
  raceSlug: string,
  year: string,
): string => `/og/${locale}/races/${raceSlug}/${year}.png`;

export const buildEditionSeoImageAlt = (
  raceName: string,
  year: string,
): string => `${raceName} ${year} social preview`;

const buildDefaultSeoImagePathForPathname = (
  locale: Locale,
  pathname: string,
): string => {
  const editionPathMatch = pathname.match(
    /^\/(en|es)\/(?:races|share)\/([^/]+)\/([^/]+)$/,
  );

  if (!editionPathMatch) {
    return buildDefaultSeoImagePath(locale);
  }

  const [, , raceSlug, year] = editionPathMatch;
  return buildEditionSeoImagePath(locale, raceSlug, year);
};

export const buildSeo = (input: SeoInput): SeoOutput => {
  const canonical = buildCanonicalUrl(input.pathname);
  const imagePath =
    input.imagePath ??
    buildDefaultSeoImagePathForPathname(input.locale, input.pathname);
  const image: SeoImage = {
    url: buildCanonicalUrl(imagePath),
    alt: input.imageAlt ?? input.title,
    width: SEO_IMAGE_WIDTH,
    height: SEO_IMAGE_HEIGHT,
  };

  return {
    ...input,
    canonical,
    alternates: buildAlternates(input.locale, input.pathname),
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      type: input.ogType ?? "website",
      siteName: SITE_NAME,
      locale: OPEN_GRAPH_LOCALES[input.locale],
      image,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      image,
    },
  };
};

import {
  INDEXABLE_SITE_ORIGIN,
  LOCALE_ALTERNATES,
  type Locale,
} from "./config";

export type SeoInput = {
  title: string;
  description: string;
  locale: Locale;
  pathname: string;
  noindex?: boolean;
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

export const buildSeo = (input: SeoInput) => ({
  ...input,
  canonical: buildCanonicalUrl(input.pathname),
  alternates: buildAlternates(input.locale, input.pathname),
});

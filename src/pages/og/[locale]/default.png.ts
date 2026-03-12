import type { APIRoute } from "astro";

import { SUPPORTED_LOCALES, type Locale } from "../../../lib/config";
import { getDictionary } from "../../../lib/i18n";
import {
  buildSeoImageResponse,
  renderSeoImagePng,
} from "../../../lib/seo-image";

export const getStaticPaths = () =>
  SUPPORTED_LOCALES.map((locale) => ({ params: { locale } }));

export const GET: APIRoute = async ({ params }) => {
  const locale = params.locale as Locale;
  const dictionary = getDictionary(locale);
  const image = await renderSeoImagePng({
    locale,
    eyebrow: dictionary.siteTagline,
    title: "Dondeteveo",
    description: dictionary.heroBody,
    footer: [dictionary.heroTitle],
  });

  return buildSeoImageResponse(image, "image/png");
};

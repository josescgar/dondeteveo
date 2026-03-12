import type { APIRoute } from "astro";

import { SUPPORTED_LOCALES, type Locale } from "../../../../../lib/config";
import { formatDistance, formatRaceDate } from "../../../../../lib/format";
import { getDictionary } from "../../../../../lib/i18n";
import { getAllRaceEditions } from "../../../../../lib/races/catalog";
import { localizeRaceEdition } from "../../../../../lib/races/localized";
import {
  buildSeoImageResponse,
  renderSeoImage,
} from "../../../../../lib/seo-image";

type RaceEdition = Awaited<ReturnType<typeof getAllRaceEditions>>[number];

export const getStaticPaths = async () => {
  const editions = await getAllRaceEditions();

  return SUPPORTED_LOCALES.flatMap((locale) =>
    editions.map((edition) => ({
      params: {
        locale,
        race: edition.raceSlug,
        year: edition.year,
      },
      props: {
        edition,
      },
    })),
  );
};

export const GET: APIRoute = ({ params, props }) => {
  const locale = params.locale as Locale;
  const dictionary = getDictionary(locale);
  const edition = localizeRaceEdition(
    (props as { edition: RaceEdition }).edition,
    locale,
  );

  return buildSeoImageResponse(
    renderSeoImage({
      locale,
      eyebrow: dictionary.raceDiscovery,
      title: `${edition.meta.name} ${edition.year}`,
      description: edition.meta.summary,
      footer: [
        formatRaceDate(edition.meta.date, locale),
        edition.meta.city,
        formatDistance(edition.meta.distanceKm, locale),
      ],
    }),
  );
};

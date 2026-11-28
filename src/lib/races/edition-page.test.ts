import { describe, expect, it } from "vitest";

import { SUPPORTED_LOCALES } from "../config";
import { getDictionary } from "../i18n";
import { getAllRaceEditions } from "./catalog";
import {
  buildEditionDescription,
  buildEditionFaq,
  buildEditionTitle,
  buildStartTimeRows,
  EDITION_DESCRIPTION_MAX_LENGTH,
  EDITION_DESCRIPTION_MIN_LENGTH,
  EDITION_TITLE_MAX_LENGTH,
  truncateAtWord,
} from "./edition-page";
import { localizeRaceEdition } from "./localized";
import { getCheerPoints } from "./points";
import type { RaceMeta, RacePointFeature } from "./schemas";

const en = getDictionary("en").editionPage;
const es = getDictionary("es").editionPage;

const meta: RaceMeta = {
  name: "Test Marathon",
  date: "2026-12-06",
  distanceKm: 42.195,
  city: "Valencia",
  startTime: "08:15",
  timezone: "Europe/Madrid",
  officialWebsiteUrl: "https://example.com/",
  summary: "A marathon through the streets of Valencia.",
  heroNote: "Hero note.",
};

const cheerPoint = (
  id: string,
  label: string,
  distanceKm: number,
): RacePointFeature => ({
  type: "Feature",
  properties: { id, label, kind: "cheer-point", distanceKm },
  geometry: { type: "Point", coordinates: [0, 0] },
});

describe("truncateAtWord", () => {
  it("leaves short text unchanged", () => {
    expect(truncateAtWord("short text", 20)).toBe("short text");
  });

  it("cuts at a word boundary and adds an ellipsis", () => {
    const result = truncateAtWord("one two three four five", 14);
    expect(result).toBe("one two three…");
    expect(result.length).toBeLessThanOrEqual(14);
  });

  it("drops trailing punctuation before the ellipsis", () => {
    expect(truncateAtWord("first, second third", 10)).toBe("first…");
  });

  it("hard-cuts a single long word", () => {
    expect(truncateAtWord("abcdefghij", 5)).toBe("abcd…");
  });
});

describe("buildEditionTitle", () => {
  it("uses the full spectator-intent pattern when it fits", () => {
    expect(buildEditionTitle({ name: "Behobia 20K", year: "2027" }, es)).toBe(
      "Behobia 20K 2027: recorrido y dónde animar | Dondeteveo",
    );
    expect(buildEditionTitle({ name: "Behobia 20K", year: "2027" }, en)).toBe(
      "Behobia 20K 2027: route & where to watch | Dondeteveo",
    );
  });

  it("drops the site name first for longer names", () => {
    expect(
      buildEditionTitle(
        { name: "Movistar Madrid Medio Maratón", year: "2027" },
        es,
      ),
    ).toBe("Movistar Madrid Medio Maratón 2027: recorrido y dónde animar");
  });

  it("then falls back to the short intent", () => {
    expect(
      buildEditionTitle(
        { name: "Nationale-Nederlanden San Silvestre Vallecana", year: "2026" },
        es,
      ),
    ).toBe("Nationale-Nederlanden San Silvestre Vallecana 2026: dónde animar");
  });

  it("truncates the name itself as a last resort", () => {
    const title = buildEditionTitle(
      {
        name: "An Extraordinarily Long Sponsored Race Name That Never Seems To End At All",
        year: "2027",
      },
      en,
    );
    expect(title.length).toBeLessThanOrEqual(EDITION_TITLE_MAX_LENGTH);
    expect(title.endsWith("… 2027")).toBe(true);
  });
});

describe("buildEditionDescription", () => {
  it("combines edition data with the summary", () => {
    const description = buildEditionDescription(
      { meta: { ...meta, name: "Test 10K" }, cheerPointCount: 4, locale: "en" },
      en,
    );
    expect(description).toBe(
      "Test 10K: where to watch on 6 December 2026 in Valencia. 42.2 km, start at 08:15 (local time) and 4 cheer points. A marathon through the streets of Valencia.",
    );
  });

  it("swaps a summary that does not fit for the call to action", () => {
    const description = buildEditionDescription(
      { meta, cheerPointCount: 4, locale: "en" },
      en,
    );
    expect(description).toBe(
      "Test Marathon: where to watch on 6 December 2026 in Valencia. 42.2 km, start at 08:15 (local time) and 4 cheer points. Share your race plan in one link.",
    );
  });

  it("appends a call to action when the result is too short", () => {
    const description = buildEditionDescription(
      {
        meta: { ...meta, name: "10K", summary: "Flat." },
        cheerPointCount: 0,
        locale: "es",
      },
      es,
    );
    expect(description).toContain("salida a las 08:15 (hora local).");
    expect(description).not.toContain("puntos para animar");
    expect(description.endsWith(es.descriptionTail)).toBe(true);
  });

  it("uses the singular for one cheer point", () => {
    expect(
      buildEditionDescription({ meta, cheerPointCount: 1, locale: "es" }, es),
    ).toContain("y 1 punto para animar.");
  });

  it("cuts at 160 characters only when no whole-sentence option fits", () => {
    const description = buildEditionDescription(
      {
        meta: {
          ...meta,
          name: "An Extraordinarily Long Sponsored Race Name That Keeps Going",
          summary: "Lorem ipsum dolor sit amet. ".repeat(10),
        },
        cheerPointCount: 2,
        locale: "en",
      },
      en,
    );
    expect(description.length).toBeLessThanOrEqual(
      EDITION_DESCRIPTION_MAX_LENGTH,
    );
    expect(description.endsWith("…")).toBe(true);
  });
});

describe("buildStartTimeRows", () => {
  it("returns a single gun start row without waves", () => {
    expect(buildStartTimeRows(meta, "Start time")).toEqual([
      { label: "Start time", startTime: "08:15" },
    ]);
  });

  it("returns one row per wave", () => {
    expect(
      buildStartTimeRows(
        {
          ...meta,
          waves: [
            { label: "Oleada 1", startTime: "08:15" },
            { label: "Oleada 2", startTime: "08:25" },
          ],
        },
        "Hora de salida",
      ),
    ).toEqual([
      { label: "Oleada 1", startTime: "08:15" },
      { label: "Oleada 2", startTime: "08:25" },
    ]);
  });
});

describe("buildEditionFaq", () => {
  const cheerPoints = [
    cheerPoint("a", "Plaza", 5),
    cheerPoint("b", "Puente", 21.1),
  ];

  it("answers the five spectator questions from data", () => {
    const faq = buildEditionFaq(
      { meta, year: "2026", cheerPoints, upcoming: true, locale: "es" },
      es,
    );
    expect(faq).toHaveLength(5);
    expect(faq[0]).toEqual({
      question: "Test Marathon 2026: ¿cuándo se celebra?",
      answer: "Se celebra el 6 de diciembre de 2026 en Valencia.",
    });
    expect(faq[1].answer).toBe(
      "La salida es a las 08:15, hora local de la carrera (Europe/Madrid).",
    );
    expect(faq[2].answer).toBe("El recorrido tiene 42,2 km.");
    expect(faq[3].answer).toContain("Plaza (5 km) y Puente (21,1 km)");
  });

  it("uses the past tense for past editions", () => {
    const faq = buildEditionFaq(
      { meta, year: "2026", cheerPoints, upcoming: false, locale: "en" },
      en,
    );
    expect(faq[0].answer).toBe("It took place on 6 December 2026 in Valencia.");
  });

  it("summarises waves with the race timezone", () => {
    const faq = buildEditionFaq(
      {
        meta: {
          ...meta,
          waves: [
            { label: "Wave 2", startTime: "08:35" },
            { label: "Wave 1", startTime: "08:15" },
            { label: "Wave 3", startTime: "08:55" },
          ],
        },
        year: "2026",
        cheerPoints,
        upcoming: true,
        locale: "en",
      },
      en,
    );
    expect(faq[1].answer).toBe(
      "The start is split into 3 waves, from 08:15 to 08:55, race local time (Europe/Madrid).",
    );
  });

  it("falls back when the edition has no cheer points", () => {
    const faq = buildEditionFaq(
      { meta, year: "2026", cheerPoints: [], upcoming: true, locale: "en" },
      en,
    );
    expect(faq[3].answer).toBe(en.faqWhereAnswerFallback);
  });
});

describe("edition SEO across the catalog", async () => {
  const editions = await getAllRaceEditions();

  for (const locale of SUPPORTED_LOCALES) {
    const strings = getDictionary(locale).editionPage;
    for (const rawEdition of editions) {
      const edition = localizeRaceEdition(rawEdition, locale);
      const id = `${locale}/${edition.raceSlug}/${edition.year}`;

      it(`${id} has a title within ${EDITION_TITLE_MAX_LENGTH} chars`, () => {
        const title = buildEditionTitle(
          { name: edition.meta.name, year: edition.year },
          strings,
        );
        expect(title.length).toBeLessThanOrEqual(EDITION_TITLE_MAX_LENGTH);
        expect(title).toContain(edition.year);
      });

      it(`${id} has a description of ${EDITION_DESCRIPTION_MIN_LENGTH}-${EDITION_DESCRIPTION_MAX_LENGTH} chars`, () => {
        const description = buildEditionDescription(
          {
            meta: edition.meta,
            cheerPointCount: getCheerPoints(edition.points).length,
            locale,
          },
          strings,
        );
        expect(description.length).toBeGreaterThanOrEqual(
          EDITION_DESCRIPTION_MIN_LENGTH,
        );
        expect(description.length).toBeLessThanOrEqual(
          EDITION_DESCRIPTION_MAX_LENGTH,
        );
      });
    }
  }
});

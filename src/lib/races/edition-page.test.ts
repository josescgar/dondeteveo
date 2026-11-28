import { describe, expect, it } from "vitest";

import { SUPPORTED_LOCALES } from "../config";
import { fillTemplate } from "../format";
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
  stripPointKindPrefix,
  truncateAtWord,
} from "./edition-page";
import { localizeRaceEdition } from "./localized";
import { getCheerPoints } from "./points";
import { getProvisionalFacts } from "./provisional";
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
  const base = {
    cheerPointCount: 4,
    provisionalFacts: [],
    locale: "en",
  } as const;

  it("prefers the summary after a short lead", () => {
    expect(
      buildEditionDescription(
        {
          ...base,
          meta: {
            ...meta,
            summary:
              "A flat, fast marathon through the streets of Valencia, finishing on a floating bridge.",
          },
        },
        en,
      ),
    ).toBe(
      "Test Marathon: where to watch on 6 December 2026 in Valencia. A flat, fast marathon through the streets of Valencia, finishing on a floating bridge.",
    );
  });

  it("drops the name from the lead to keep a summary that would not fit", () => {
    const summary =
      "Urban course through the old town and along the river, with a fast final kilometre into the main square.";
    expect(
      buildEditionDescription(
        {
          ...base,
          meta: { ...meta, name: "A Long Sponsored Race Name 10K", summary },
        },
        en,
      ),
    ).toBe(`Where to watch on 6 December 2026 in Valencia. ${summary}`);
  });

  it("adds generated facts, with the timezone, when the summary is short", () => {
    expect(
      buildEditionDescription(
        { ...base, meta: { ...meta, summary: "Flat and fast." } },
        en,
      ),
    ).toBe(
      "Test Marathon: where to watch on 6 December 2026 in Valencia. 42.2 km, start at 08:15 (Europe/Madrid), 4 cheer points. Flat and fast.",
    );
  });

  it("falls back to facts and a call to action when the summary is too long", () => {
    const description = buildEditionDescription(
      {
        ...base,
        meta: { ...meta, summary: "Lorem ipsum dolor sit amet. ".repeat(10) },
      },
      en,
    );
    expect(description).toBe(
      "Test Marathon: where to watch on 6 December 2026 in Valencia. 42.2 km, start at 08:15 (Europe/Madrid), 4 cheer points. Share your race plan in one link.",
    );
  });

  it("uses the singular for one cheer point", () => {
    expect(
      buildEditionDescription(
        {
          ...base,
          cheerPointCount: 1,
          locale: "es",
          meta: { ...meta, name: "10K", summary: "Lorem ipsum. ".repeat(20) },
        },
        es,
      ),
    ).toContain(", 1 punto para animar.");
  });

  it("never states a provisional start time or provisional cheer points", () => {
    const description = buildEditionDescription(
      { ...base, provisionalFacts: ["route", "startTime"], meta },
      en,
    );
    expect(description).not.toContain("08:15");
    expect(description).not.toContain("cheer point");
  });

  it("cuts at 160 characters only when no whole-sentence option fits", () => {
    const description = buildEditionDescription(
      {
        ...base,
        meta: {
          ...meta,
          name: "An Extraordinarily Long Sponsored Race Name That Keeps Going And Going Forever",
          summary: "Lorem ipsum dolor sit amet. ".repeat(10),
        },
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

describe("stripPointKindPrefix", () => {
  it("drops the kind prefix", () => {
    expect(
      stripPointKindPrefix(
        "Punto para animar - Plaza de Armas",
        "Punto para animar",
      ),
    ).toBe("Plaza de Armas");
    expect(stripPointKindPrefix("Cheer point - Gros", "Cheer point")).toBe(
      "Gros",
    );
  });

  it("leaves labels without the prefix untouched", () => {
    expect(stripPointKindPrefix("Plaza de Cuba", "Cheer point")).toBe(
      "Plaza de Cuba",
    );
    expect(stripPointKindPrefix("Cheer point", "Cheer point")).toBe(
      "Cheer point",
    );
  });
});

describe("buildEditionFaq", () => {
  const cheerPoints = [
    cheerPoint("a", "Punto para animar - Plaza", 5),
    cheerPoint("b", "Punto para animar - Puente", 21.1),
  ];
  const base = {
    meta,
    year: "2026",
    cheerPoints,
    cheerPointPrefix: "Punto para animar",
    provisionalFacts: [],
    upcoming: true,
    locale: "es",
  } as const;

  it("answers the five spectator questions from data", () => {
    const faq = buildEditionFaq(base, es);
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
    expect(faq[3].answer).not.toContain("Punto para animar -");
  });

  it("uses the past tense in question and answer for past editions", () => {
    const faq = buildEditionFaq({ ...base, upcoming: false }, es);
    expect(faq[0]).toEqual({
      question: "Test Marathon 2026: ¿cuándo se celebró?",
      answer: "Se celebró el 6 de diciembre de 2026 en Valencia.",
    });
    expect(faq[1]).toEqual({
      question: "¿A qué hora fue la salida?",
      answer:
        "La salida fue a las 08:15, hora local de la carrera (Europe/Madrid).",
    });
  });

  it("gives the first wave start and points to the start times, with the special note", () => {
    const faq = buildEditionFaq(
      {
        ...base,
        locale: "en",
        meta: {
          ...meta,
          specialNote: "Wheelchair athletes start first.",
          waves: [
            { label: "General", startTime: "08:30" },
            { label: "Wheelchair", startTime: "08:29" },
          ],
        },
      },
      en,
    );
    expect(faq[1].answer).toBe(
      "The first start is at 08:29, race local time (Europe/Madrid). Every start is listed under Start times. Wheelchair athletes start first.",
    );
  });

  it("appends a staggered-start special note without waves", () => {
    const faq = buildEditionFaq(
      {
        ...base,
        meta: { ...meta, specialNote: "La carrera tiene salidas escalonadas." },
      },
      es,
    );
    expect(faq[1].answer).toBe(
      "La salida es a las 08:15, hora local de la carrera (Europe/Madrid). La carrera tiene salidas escalonadas.",
    );
  });

  it("qualifies a provisional start time and route", () => {
    const faq = buildEditionFaq(
      { ...base, provisionalFacts: ["route", "startTime"] },
      es,
    );
    expect(faq[1].answer).toBe(
      "Hora de salida prevista: 08:15, hora local de la carrera (Europe/Madrid), pendiente de confirmación.",
    );
    expect(faq[3].answer).toContain(es.faqWhereAnswerProvisional);
  });

  it("falls back when the edition has no cheer points", () => {
    const faq = buildEditionFaq({ ...base, cheerPoints: [] }, es);
    expect(faq[3].answer).toBe(es.faqWhereAnswerFallback);
  });
});

describe("edition SEO across the catalog", async () => {
  const editions = await getAllRaceEditions();

  for (const locale of SUPPORTED_LOCALES) {
    const dictionary = getDictionary(locale);
    const strings = dictionary.editionPage;
    for (const rawEdition of editions) {
      const edition = localizeRaceEdition(rawEdition, locale);
      const id = `${locale}/${edition.raceSlug}/${edition.year}`;
      const provisionalFacts = getProvisionalFacts(edition.meta.provisional);
      const cheerPoints = getCheerPoints(edition.points);
      const description = buildEditionDescription(
        {
          meta: edition.meta,
          cheerPointCount: cheerPoints.length,
          provisionalFacts,
          locale,
        },
        strings,
      );
      const faq = buildEditionFaq(
        {
          meta: edition.meta,
          year: edition.year,
          cheerPoints,
          cheerPointPrefix: dictionary.cheerPointLabel,
          provisionalFacts,
          upcoming: true,
          locale,
        },
        strings,
      );

      it(`${id} has a title within ${EDITION_TITLE_MAX_LENGTH} chars`, () => {
        const title = buildEditionTitle(
          { name: edition.meta.name, year: edition.year },
          strings,
        );
        expect(title.length).toBeLessThanOrEqual(EDITION_TITLE_MAX_LENGTH);
        expect(title).toContain(edition.year);
      });

      it(`${id} has a whole-sentence description of ${EDITION_DESCRIPTION_MIN_LENGTH}-${EDITION_DESCRIPTION_MAX_LENGTH} chars`, () => {
        expect(description.length).toBeGreaterThanOrEqual(
          EDITION_DESCRIPTION_MIN_LENGTH,
        );
        expect(description.length).toBeLessThanOrEqual(
          EDITION_DESCRIPTION_MAX_LENGTH,
        );
        expect(description.endsWith("…")).toBe(false);
      });

      it(`${id} never states a provisional fact unqualified`, () => {
        const startAnswer = faq[1].answer;
        const whereAnswer = faq[3].answer;
        if (provisionalFacts.includes("startTime")) {
          expect(description).not.toContain(edition.meta.startTime);
          expect(startAnswer).toContain(
            fillTemplate(strings.faqStartAnswerProvisional, {
              startTime: edition.meta.startTime,
              timezone: edition.meta.timezone,
            }),
          );
        } else {
          expect(startAnswer).not.toContain(
            strings.faqStartAnswerProvisional.split("{")[0],
          );
        }
        if (provisionalFacts.includes("route")) {
          expect(description).not.toMatch(
            new RegExp(
              strings.descriptionCheerPointsMany.replace("{count}", "\\d+"),
            ),
          );
          expect(description).not.toContain(strings.descriptionCheerPointsOne);
          if (cheerPoints.length > 0) {
            expect(whereAnswer).toContain(strings.faqWhereAnswerProvisional);
          }
        }
      });
    }
  }
});

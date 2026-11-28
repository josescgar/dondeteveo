import { describe, expect, it } from "vitest";

import type { RaceEdition } from "./races/catalog";
import {
  buildEditionStructuredData,
  buildHomeStructuredData,
  buildZonedIsoDateTime,
  serializeJsonLd,
} from "./structured-data";

const buildEdition = (overrides: Partial<RaceEdition["meta"]> = {}) =>
  ({
    countryCode: "es",
    raceSlug: "valencia-marathon",
    year: "2026",
    meta: {
      name: "Valencia Marathon",
      date: "2026-12-06",
      distanceKm: 42.195,
      city: "Valencia",
      startTime: "08:15",
      timezone: "Europe/Madrid",
      officialWebsiteUrl: "https://www.valenciaciudaddelrunning.com/",
      summary: "Fast, flat marathon through the centre of Valencia.",
      heroNote: "Cheer along the old riverbed.",
      ...overrides,
    },
    source: {
      officialSourceName: "Official",
      officialSourceUrl: "https://example.com/",
      routeSourceType: "manual-trace",
      notes: "Test fixture.",
    },
    route: { type: "FeatureCollection", features: [] },
    points: { type: "FeatureCollection", features: [] },
  }) as unknown as RaceEdition;

describe("buildZonedIsoDateTime", () => {
  it("uses the winter offset before the DST change", () => {
    expect(buildZonedIsoDateTime("2026-03-28", "09:00", "Europe/Madrid")).toBe(
      "2026-03-28T09:00:00+01:00",
    );
  });

  it("uses the summer offset on the day DST starts", () => {
    expect(buildZonedIsoDateTime("2026-03-29", "09:00", "Europe/Madrid")).toBe(
      "2026-03-29T09:00:00+02:00",
    );
  });

  it("uses the summer offset just before DST ends", () => {
    expect(buildZonedIsoDateTime("2026-10-25", "01:30", "Europe/Madrid")).toBe(
      "2026-10-25T01:30:00+02:00",
    );
  });

  it("handles the Canary Islands, negative and fractional offsets", () => {
    expect(
      buildZonedIsoDateTime("2026-12-06", "08:00", "Atlantic/Canary"),
    ).toBe("2026-12-06T08:00:00+00:00");
    expect(
      buildZonedIsoDateTime("2026-11-01", "08:00", "America/New_York"),
    ).toBe("2026-11-01T08:00:00-05:00");
    expect(buildZonedIsoDateTime("2026-07-01", "06:00", "Asia/Kolkata")).toBe(
      "2026-07-01T06:00:00+05:30",
    );
  });
});

describe("serializeJsonLd", () => {
  it("escapes markup so data cannot close the script element", () => {
    const serialized = serializeJsonLd({
      "@context": "https://schema.org",
      name: "</script><script>alert(1)</script> & co",
    });

    expect(serialized).not.toContain("<");
    expect(serialized).not.toContain(">");
    expect(serialized).not.toContain("&");
    expect(JSON.parse(serialized)).toEqual({
      "@context": "https://schema.org",
      name: "</script><script>alert(1)</script> & co",
    });
  });
});

describe("buildHomeStructuredData", () => {
  it("emits a localized WebSite and the Organization", () => {
    const document = buildHomeStructuredData("es");
    const [website, organization] = document["@graph"] as Record<
      string,
      unknown
    >[];

    expect(document["@context"]).toBe("https://schema.org");
    expect(website).toMatchObject({
      "@type": "WebSite",
      name: "Dondeteveo",
      url: "https://dondeteveo.com/es/",
      inLanguage: "es",
      publisher: { "@id": "https://dondeteveo.com/#organization" },
    });
    expect(organization).toMatchObject({
      "@type": "Organization",
      "@id": "https://dondeteveo.com/#organization",
      name: "Dondeteveo",
      url: "https://dondeteveo.com/es/",
      logo: "https://dondeteveo.com/logo.png",
    });
  });

  it("points the Organization at the rendered locale's homepage", () => {
    const [, organization] = buildHomeStructuredData("en")["@graph"] as Record<
      string,
      unknown
    >[];

    expect(organization.url).toBe("https://dondeteveo.com/en/");
  });
});

describe("buildEditionStructuredData", () => {
  it("emits a SportsEvent with the race-local start and location", () => {
    const [event] = buildEditionStructuredData("en", buildEdition());

    expect(event).toEqual({
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      name: "Valencia Marathon 2026",
      startDate: "2026-12-06T08:15:00+01:00",
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@type": "Place",
        name: "Valencia",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Valencia",
          addressCountry: "ES",
        },
      },
      url: "https://dondeteveo.com/en/races/valencia-marathon/2026/",
      image: "https://dondeteveo.com/og/en/races/valencia-marathon/2026.png",
      description: "Fast, flat marathon through the centre of Valencia.",
      inLanguage: "en",
      sameAs: "https://www.valenciaciudaddelrunning.com/",
    });
  });

  it("emits only the date when the start time is provisional", () => {
    const [event] = buildEditionStructuredData(
      "en",
      buildEdition({ provisional: { route: true, startTime: true } }),
    );

    expect(event.startDate).toBe("2026-12-06");
  });

  it("keeps the zoned start when only the route is provisional", () => {
    const [event] = buildEditionStructuredData(
      "en",
      buildEdition({ provisional: { route: true } }),
    );

    expect(event.startDate).toBe("2026-12-06T08:15:00+01:00");
  });

  it("emits a Home > Races > Edition breadcrumb in the page locale", () => {
    const [, breadcrumbs] = buildEditionStructuredData(
      "es",
      buildEdition({ name: "Maratón de Valencia" }),
    );

    expect(breadcrumbs).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Dondeteveo",
          item: "https://dondeteveo.com/es/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Encontrar carreras",
          item: "https://dondeteveo.com/es/races/",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Maratón de Valencia 2026",
          item: "https://dondeteveo.com/es/races/valencia-marathon/2026/",
        },
      ],
    });
  });
});

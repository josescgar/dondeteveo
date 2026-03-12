import { describe, expect, it } from "vitest";

import {
  buildAlternates,
  buildCanonicalUrl,
  buildDefaultSeoImagePath,
  buildEditionSeoImageAlt,
  buildEditionSeoImagePath,
  buildSeo,
} from "./seo";

describe("seo helpers", () => {
  it("builds canonical and locale alternate urls", () => {
    expect(buildCanonicalUrl("/en/races")).toBe(
      "https://dondeteveo.com/en/races",
    );
    expect(buildAlternates("en", "/en/races")).toEqual([
      { hrefLang: "en", href: "https://dondeteveo.com/en/races" },
      { hrefLang: "es", href: "https://dondeteveo.com/es/races" },
    ]);
  });

  it("uses a shared localized social image by default", () => {
    const seo = buildSeo({
      title: "Dondeteveo | Race discovery",
      description: "Browse race editions.",
      locale: "en",
      pathname: "/en/races",
    });

    expect(buildDefaultSeoImagePath("en")).toBe("/og/en/default.png");
    expect(seo.canonical).toBe("https://dondeteveo.com/en/races");
    expect(seo.openGraph.locale).toBe("en_US");
    expect(seo.openGraph.image.url).toBe(
      "https://dondeteveo.com/og/en/default.png",
    );
    expect(seo.openGraph.image.alt).toBe("Dondeteveo | Race discovery");
    expect(seo.twitter.card).toBe("summary_large_image");
  });

  it("supports page-specific race images without changing noindex", () => {
    const imagePath = buildEditionSeoImagePath(
      "es",
      "carrera-triana-los-remedios-10k",
      "2026",
    );
    const imageAlt = buildEditionSeoImageAlt(
      "Triana - Los Remedios 10K",
      "2026",
    );
    const seo = buildSeo({
      title: "Triana - Los Remedios 10K 2026 | Dondeteveo",
      description: "Plan where to cheer.",
      locale: "es",
      pathname: "/es/share/carrera-triana-los-remedios-10k/2026",
      noindex: true,
      imagePath,
      imageAlt,
    });

    expect(seo.noindex).toBe(true);
    expect(imagePath).toBe(
      "/og/es/races/carrera-triana-los-remedios-10k/2026.png",
    );
    expect(seo.openGraph.image.url).toBe(
      "https://dondeteveo.com/og/es/races/carrera-triana-los-remedios-10k/2026.png",
    );
    expect(seo.twitter.image.alt).toBe(imageAlt);
  });
});

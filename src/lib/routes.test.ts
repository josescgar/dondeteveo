import { describe, expect, it } from "vitest";

import {
  buildAboutPath,
  buildContributePath,
  buildHomePath,
  buildPrivacyPath,
  buildRacePath,
  buildRacesPath,
  buildSharePath,
  EDITION_PATH_PATTERN,
  switchLocalePath,
} from "./routes";

describe("route builders", () => {
  it("builds home paths", () => {
    expect(buildHomePath("en")).toBe("/en");
    expect(buildHomePath("es")).toBe("/es");
  });

  it("builds races listing paths", () => {
    expect(buildRacesPath("en")).toBe("/en/races");
    expect(buildRacesPath("es")).toBe("/es/races");
  });

  it("builds race paths with and without a year", () => {
    expect(buildRacePath("en", "carrera-triana-los-remedios-10k", "2026")).toBe(
      "/en/races/carrera-triana-los-remedios-10k/2026",
    );
    expect(buildRacePath("es", "carrera-triana-los-remedios-10k")).toBe(
      "/es/races/carrera-triana-los-remedios-10k",
    );
  });

  it("builds share paths", () => {
    expect(
      buildSharePath("en", "carrera-triana-los-remedios-10k", "2026"),
    ).toBe("/en/share/carrera-triana-los-remedios-10k/2026");
  });

  it("builds about paths", () => {
    expect(buildAboutPath("en")).toBe("/en/about");
    expect(buildAboutPath("es")).toBe("/es/about");
  });

  it("builds privacy paths", () => {
    expect(buildPrivacyPath("en")).toBe("/en/privacy");
    expect(buildPrivacyPath("es")).toBe("/es/privacy");
  });

  it("builds contribute paths", () => {
    expect(buildContributePath("en")).toBe("/en/contribute");
    expect(buildContributePath("es")).toBe("/es/contribute");
  });

  it("switches the leading locale segment in a path", () => {
    expect(
      switchLocalePath("/en/races/carrera-triana-los-remedios-10k", "es"),
    ).toBe("/es/races/carrera-triana-los-remedios-10k");
    expect(switchLocalePath("/es", "en")).toBe("/en");
  });
});

describe("EDITION_PATH_PATTERN", () => {
  it("matches race edition paths", () => {
    const match = "/en/races/some-race/2026".match(EDITION_PATH_PATTERN);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("en");
    expect(match![2]).toBe("some-race");
    expect(match![3]).toBe("2026");
  });

  it("matches share edition paths", () => {
    const match = "/es/share/some-race/2026".match(EDITION_PATH_PATTERN);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("es");
    expect(match![2]).toBe("some-race");
    expect(match![3]).toBe("2026");
  });

  it("does not match non-edition paths", () => {
    expect("/en/about".match(EDITION_PATH_PATTERN)).toBeNull();
    expect("/en/races".match(EDITION_PATH_PATTERN)).toBeNull();
    expect("/en/races/some-race".match(EDITION_PATH_PATTERN)).toBeNull();
  });
});

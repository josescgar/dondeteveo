import { describe, expect, it } from "vitest";

import { buildShareHref, getDefaultShareValue } from "./share-planner.logic";

describe("share planner logic", () => {
  it("builds a share href with fragment state", () => {
    const href = buildShareHref({
      locale: "en",
      raceSlug: "sevilla-half-marathon",
      year: "2026",
      mode: "pace",
      value: "05:00",
      name: "Pepe",
    });

    expect(href).toContain("/en/share/sevilla-half-marathon/2026#");
    expect(href).toContain("mode=pace");
  });

  it("uses mode-specific default values", () => {
    expect(getDefaultShareValue("pace")).toBe("05:00");
    expect(getDefaultShareValue("finish")).toBe("01:45:00");
  });
});

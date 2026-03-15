import { describe, expect, it } from "vitest";

import {
  buildShareHref,
  getDefaultShareValue,
  isValidShareValue,
  maskTimeInput,
  validateNickname,
} from "./share-planner.logic";

describe("share planner logic", () => {
  it("builds a share href with fragment state", () => {
    const href = buildShareHref({
      locale: "en",
      raceSlug: "carrera-triana-los-remedios-10k",
      year: "2026",
      mode: "pace",
      value: "05:00",
      name: "Pepe",
    });

    expect(href).toContain("/en/share/carrera-triana-los-remedios-10k/2026#");
    expect(href).toContain("mode=pace");
  });

  it("includes wave in share href when provided", () => {
    const href = buildShareHref({
      locale: "en",
      raceSlug: "carrera-triana-los-remedios-10k",
      year: "2026",
      mode: "pace",
      value: "05:00",
      name: "",
      wave: 1,
    });

    expect(href).toContain("wave=1");
  });

  it("does not include wave in share href when undefined", () => {
    const href = buildShareHref({
      locale: "en",
      raceSlug: "carrera-triana-los-remedios-10k",
      year: "2026",
      mode: "pace",
      value: "05:00",
      name: "",
    });

    expect(href).not.toContain("wave=");
  });

  it("uses mode-specific default values", () => {
    expect(getDefaultShareValue("pace")).toBe("05:00");
    expect(getDefaultShareValue("finish")).toBe("01:45:00");
  });
});

describe("isValidShareValue", () => {
  it("accepts valid pace values", () => {
    expect(isValidShareValue("pace", "05:00")).toBe(true);
    expect(isValidShareValue("pace", "4:30")).toBe(true);
    expect(isValidShareValue("pace", "12:59")).toBe(true);
  });

  it("rejects invalid pace values", () => {
    expect(isValidShareValue("pace", "")).toBe(false);
    expect(isValidShareValue("pace", "abc")).toBe(false);
    expect(isValidShareValue("pace", "5:60")).toBe(false);
    expect(isValidShareValue("pace", "00:00")).toBe(false);
    expect(isValidShareValue("pace", "05:0")).toBe(false);
    expect(isValidShareValue("pace", "05:000")).toBe(false);
  });

  it("accepts valid finish time values", () => {
    expect(isValidShareValue("finish", "01:45:00")).toBe(true);
    expect(isValidShareValue("finish", "3:30:00")).toBe(true);
    expect(isValidShareValue("finish", "0:30:00")).toBe(true);
  });

  it("rejects invalid finish time values", () => {
    expect(isValidShareValue("finish", "")).toBe(false);
    expect(isValidShareValue("finish", "abc")).toBe(false);
    expect(isValidShareValue("finish", "01:60:00")).toBe(false);
    expect(isValidShareValue("finish", "01:00:60")).toBe(false);
    expect(isValidShareValue("finish", "00:00:00")).toBe(false);
    expect(isValidShareValue("finish", "1:45")).toBe(false);
  });
});

describe("validateNickname", () => {
  it("accepts empty string", () => {
    expect(validateNickname("")).toEqual({ valid: true });
  });

  it("accepts alphanumeric names", () => {
    expect(validateNickname("Runner42")).toEqual({ valid: true });
  });

  it("accepts accented characters", () => {
    expect(validateNickname("José")).toEqual({ valid: true });
  });

  it("accepts spaces", () => {
    expect(validateNickname("José López")).toEqual({ valid: true });
  });

  it("accepts basic punctuation: apostrophe, period, hyphen", () => {
    expect(validateNickname("O'Brien")).toEqual({ valid: true });
    expect(validateNickname("Dr. Smith")).toEqual({ valid: true });
    expect(validateNickname("Jean-Luc")).toEqual({ valid: true });
  });

  it("accepts name at exactly 30 characters", () => {
    expect(validateNickname("a".repeat(30))).toEqual({ valid: true });
  });

  it("rejects name over 30 characters", () => {
    expect(validateNickname("a".repeat(31))).toEqual({
      valid: false,
      reason: "too-long",
    });
  });

  it("rejects URL-problematic characters", () => {
    for (const char of ["#", "&", "=", "+"]) {
      expect(validateNickname(`foo${char}bar`)).toEqual({
        valid: false,
        reason: "invalid-characters",
      });
    }
  });

  it("rejects control characters", () => {
    expect(validateNickname("foo\x00bar")).toEqual({
      valid: false,
      reason: "invalid-characters",
    });
  });

  it("checks characters before length", () => {
    const longInvalid = "#".repeat(31);
    expect(validateNickname(longInvalid)).toEqual({
      valid: false,
      reason: "invalid-characters",
    });
  });
});

describe("maskTimeInput", () => {
  it("strips non-digit characters", () => {
    expect(maskTimeInput("ab12cd", "pace")).toBe("12");
    expect(maskTimeInput("a1b2c3d4", "finish")).toBe("12:34");
  });

  it("auto-inserts colon for pace every 2 digits", () => {
    expect(maskTimeInput("0", "pace")).toBe("0");
    expect(maskTimeInput("05", "pace")).toBe("05");
    expect(maskTimeInput("053", "pace")).toBe("05:3");
    expect(maskTimeInput("0500", "pace")).toBe("05:00");
  });

  it("auto-inserts colons for finish time every 2 digits", () => {
    expect(maskTimeInput("0", "finish")).toBe("0");
    expect(maskTimeInput("01", "finish")).toBe("01");
    expect(maskTimeInput("014", "finish")).toBe("01:4");
    expect(maskTimeInput("0145", "finish")).toBe("01:45");
    expect(maskTimeInput("01450", "finish")).toBe("01:45:0");
    expect(maskTimeInput("014500", "finish")).toBe("01:45:00");
  });

  it("truncates pace to 4 digits max", () => {
    expect(maskTimeInput("05001", "pace")).toBe("05:00");
  });

  it("truncates finish time to 6 digits max", () => {
    expect(maskTimeInput("0145001", "finish")).toBe("01:45:00");
  });

  it("returns empty string for empty input", () => {
    expect(maskTimeInput("", "pace")).toBe("");
    expect(maskTimeInput("", "finish")).toBe("");
  });
});

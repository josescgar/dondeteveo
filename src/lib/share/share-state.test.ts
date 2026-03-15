import { describe, expect, it } from "vitest";

import {
  dayOffsetFromMinutes,
  formatMinutesAsClock,
  parseFinishTimeToMinutes,
  parsePaceToMinutesPerKm,
  parseShareState,
  serializeShareState,
} from "./share-state";

describe("share state helpers", () => {
  it("serializes and parses a share state", () => {
    const serialized = serializeShareState({
      mode: "pace",
      value: "05:00",
      name: "Pepe",
    });
    const parsed = parseShareState(serialized);

    expect(parsed).toEqual({ mode: "pace", value: "05:00", name: "Pepe" });
  });

  it("parses finish time strings", () => {
    expect(parseFinishTimeToMinutes("01:45:00")).toBe(105);
  });

  it("parses pace strings", () => {
    expect(parsePaceToMinutesPerKm("04:45")).toBe(4.75);
  });

  it("rejects invalid time fragments", () => {
    expect(parsePaceToMinutesPerKm("05:99")).toBeNull();
    expect(parsePaceToMinutesPerKm("00:00")).toBeNull();
    expect(parseFinishTimeToMinutes("1:45")).toBeNull();
    expect(parseFinishTimeToMinutes("01:99:99")).toBeNull();
    expect(parseFinishTimeToMinutes("00:00:00")).toBeNull();
    expect(parseShareState("mode=pace&value=00:00")).toBeNull();
    expect(parseShareState("mode=finish&value=00:00:00")).toBeNull();
  });

  it("formats minutes as a clock string", () => {
    expect(formatMinutesAsClock(612)).toBe("10:12");
  });

  it("wraps clock times past midnight", () => {
    expect(formatMinutesAsClock(1500)).toBe("01:00");
    expect(formatMinutesAsClock(2880)).toBe("00:00");
  });

  it("round-trips wave index through serialize and parse", () => {
    const serialized = serializeShareState({
      mode: "pace",
      value: "05:00",
      wave: 1,
    });
    const parsed = parseShareState(serialized);

    expect(parsed).toEqual({ mode: "pace", value: "05:00", wave: 1 });
  });

  it("parses fragment without wave as undefined", () => {
    const parsed = parseShareState("mode=pace&value=05%3A00");

    expect(parsed).not.toBeNull();
    expect(parsed!.wave).toBeUndefined();
  });

  it("parses wave=0 correctly", () => {
    const parsed = parseShareState("mode=pace&value=05%3A00&wave=0");

    expect(parsed).not.toBeNull();
    expect(parsed!.wave).toBe(0);
  });

  it("rejects non-numeric wave value", () => {
    expect(parseShareState("mode=pace&value=05%3A00&wave=abc")).toBeNull();
  });

  it("rejects negative wave value", () => {
    expect(parseShareState("mode=pace&value=05%3A00&wave=-1")).toBeNull();
  });

  it("computes day offset from minutes", () => {
    expect(dayOffsetFromMinutes(600)).toBe(0);
    expect(dayOffsetFromMinutes(1440)).toBe(1);
    expect(dayOffsetFromMinutes(1500)).toBe(1);
    expect(dayOffsetFromMinutes(2880)).toBe(2);
  });
});

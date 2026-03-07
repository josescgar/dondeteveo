import { describe, expect, it } from "vitest";

import {
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
});

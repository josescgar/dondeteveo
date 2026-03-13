import { describe, expect, it } from "vitest";

import {
  buildRaceInfoFields,
  formatCountryName,
  formatDistance,
  formatRaceDate,
  getTodayInTimeZone,
} from "./format";

describe("format helpers", () => {
  it("formats race dates for each locale", () => {
    expect(formatRaceDate("2026-03-15", "en")).toBe("15 March 2026");
    expect(formatRaceDate("2026-03-15", "es")).toBe("15 de marzo de 2026");
  });

  it("formats distance using locale-aware decimal separators", () => {
    expect(formatDistance(10, "en")).toBe("10 km");
    expect(formatDistance(21.1, "en")).toBe("21.1 km");
    expect(formatDistance(21.1, "es")).toBe("21,1 km");
  });

  it("formats localized country names from ISO codes", () => {
    expect(formatCountryName("es", "en")).toBe("Spain");
    expect(formatCountryName(" es ", "es")).toBe("Espa\u00f1a");
  });

  it("falls back to the normalized country code when it is not a valid region", () => {
    expect(formatCountryName("xx", "en")).toBe("XX");
    expect(formatCountryName("e1", "en")).toBe("E1");
  });

  it("builds race info fields with correct labels and values", () => {
    const edition = {
      date: "2026-03-15",
      city: "Valencia",
      startTime: "09:00",
      timezone: "Europe/Madrid",
    };
    const labels = { date: "Date", city: "City", startTime: "Start time" };

    const fields = buildRaceInfoFields(edition, labels, "en");

    expect(fields).toHaveLength(3);
    expect(fields[0]).toEqual({ label: "Date", value: "15 March 2026" });
    expect(fields[1]).toEqual({ label: "City", value: "Valencia" });
    expect(fields[2]).toEqual({
      label: "Start time",
      value: "09:00 (Europe/Madrid)",
    });
  });

  it("formats the date with the correct locale in race info fields", () => {
    const edition = {
      date: "2026-03-15",
      city: "Sevilla",
      startTime: "08:30",
      timezone: "Europe/Madrid",
    };
    const labels = {
      date: "Fecha",
      city: "Ciudad",
      startTime: "Hora de salida",
    };

    const fields = buildRaceInfoFields(edition, labels, "es");

    expect(fields[0].value).toBe("15 de marzo de 2026");
  });

  it("gets the calendar day in a specific timezone", () => {
    const referenceDate = new Date("2026-03-15T23:30:00Z");

    expect(getTodayInTimeZone("Europe/Madrid", referenceDate)).toBe(
      "2026-03-16",
    );
    expect(getTodayInTimeZone("America/New_York", referenceDate)).toBe(
      "2026-03-15",
    );
  });
});

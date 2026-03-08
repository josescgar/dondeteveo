import { buildSharePath } from "../../lib/format";
import {
  parseFinishTimeToMinutes,
  parsePaceToMinutesPerKm,
  serializeShareState,
  type ShareMode,
} from "../../lib/share/share-state";
import type { Locale } from "../../lib/config";

export type SharePlannerInput = {
  locale: Locale;
  raceSlug: string;
  year: string;
  mode: ShareMode;
  value: string;
  name: string;
};

export const getDefaultShareValue = (mode: ShareMode): string =>
  mode === "pace" ? "05:00" : "01:45:00";

export const buildShareHref = ({
  locale,
  raceSlug,
  year,
  mode,
  value,
  name,
}: SharePlannerInput): string => {
  const fragment = serializeShareState({
    mode,
    value,
    name: name.trim() || undefined,
  });

  return `${buildSharePath(locale, raceSlug, year)}#${fragment}`;
};

export const isValidShareValue = (mode: ShareMode, value: string): boolean =>
  mode === "pace"
    ? parsePaceToMinutesPerKm(value) !== null
    : parseFinishTimeToMinutes(value) !== null;

export const maskTimeInput = (raw: string, mode: ShareMode): string => {
  const digits = raw.replace(/\D/g, "");
  const maxDigits = mode === "pace" ? 4 : 6;
  const truncated = digits.slice(0, maxDigits);

  // Auto-insert colons after every 2-digit group.
  const parts: string[] = [];
  for (let i = 0; i < truncated.length; i += 2) {
    parts.push(truncated.slice(i, i + 2));
  }
  return parts.join(":");
};

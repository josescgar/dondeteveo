import { buildSharePath } from "../../lib/routes";
import {
  parseFinishTimeToMinutes,
  parsePaceToMinutesPerKm,
  serializeShareState,
  type ShareMode,
} from "../../lib/share/share-state";
import type { Locale } from "../../lib/config";

export const NICKNAME_MAX_LENGTH = 30;

const NICKNAME_PATTERN = /^[\p{L}\p{N}\s'.-]+$/u;

export type NicknameValidationResult =
  | { valid: true }
  | { valid: false; reason: "invalid-characters" | "too-long" };

export const validateNickname = (name: string): NicknameValidationResult => {
  if (name.length === 0) return { valid: true };
  if (!NICKNAME_PATTERN.test(name))
    return { valid: false, reason: "invalid-characters" };
  if (name.length > NICKNAME_MAX_LENGTH)
    return { valid: false, reason: "too-long" };
  return { valid: true };
};

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

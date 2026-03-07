import { buildSharePath } from "../../lib/format";
import {
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

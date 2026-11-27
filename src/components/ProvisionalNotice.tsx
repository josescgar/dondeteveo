import type { Locale } from "../lib/config";
import { getDictionary } from "../lib/i18n";
import type { ProvisionalFact } from "../lib/races/provisional";

type Props = {
  locale: Locale;
  facts: ProvisionalFact[];
  /** Adds a line explaining that predicted times may change. */
  showShareTimesNote?: boolean;
  /** Omits the per-fact lines (used where the full notice is already visible). */
  compact?: boolean;
  class?: string;
};

/**
 * Pending-confirmation banner for editions with a provisional route and/or
 * start time. Renders nothing for fully confirmed editions.
 */
export function ProvisionalNotice({
  locale,
  facts,
  showShareTimesNote = false,
  compact = false,
  class: className = "",
}: Props) {
  if (facts.length === 0) {
    return null;
  }

  const dictionary = getDictionary(locale);
  const factText: Record<ProvisionalFact, string> = {
    route: dictionary.provisionalRouteNotice,
    startTime: dictionary.provisionalStartTimeNotice,
  };

  return (
    <div
      class={`banner-warning ${className}`.trim()}
      role="note"
      data-provisional-notice
    >
      <div class="text-warning font-mono text-[10px] tracking-[0.28em] uppercase">
        // {dictionary.provisionalNoticeTitle}
      </div>
      {!compact &&
        facts.map((fact) => (
          <p
            key={fact}
            class="text-text mt-3 font-mono text-sm leading-6"
            data-provisional-fact={fact}
          >
            {factText[fact]}
          </p>
        ))}
      {showShareTimesNote && (
        <p class="text-text mt-3 font-mono text-sm leading-6">
          {dictionary.provisionalShareTimesNotice}
        </p>
      )}
    </div>
  );
}

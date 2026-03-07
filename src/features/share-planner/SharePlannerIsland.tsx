import { useState } from "preact/hooks";

import type { Locale } from "../../lib/config";
import { getDictionary } from "../../lib/i18n";
import type { ShareMode } from "../../lib/share/share-state";
import { buildShareHref, getDefaultShareValue } from "./share-planner.logic";

type Props = {
  locale: Locale;
  raceSlug: string;
  year: string;
};

export default function SharePlannerIsland({ locale, raceSlug, year }: Props) {
  const dictionary = getDictionary(locale);
  const [mode, setMode] = useState<ShareMode>("pace");
  const [value, setValue] = useState(getDefaultShareValue("pace"));
  const [name, setName] = useState("");

  const handleModeChange = (nextMode: ShareMode) => {
    setMode(nextMode);
    setValue(getDefaultShareValue(nextMode));
  };

  const href = buildShareHref({ locale, raceSlug, year, mode, value, name });

  return (
    <div class="rounded-[2rem] border border-[var(--line)] bg-[var(--ink)] p-5 text-white shadow-[var(--shadow-card)]">
      <div class="text-xs font-semibold tracking-[0.22em] text-white/50 uppercase">
        {dictionary.share}
      </div>
      <p class="mt-3 text-sm leading-7 text-white/75">
        {dictionary.shareIntro}
      </p>
      <div class="mt-5 grid gap-4 md:grid-cols-2">
        <label class="space-y-2">
          <span class="text-xs font-semibold tracking-[0.22em] text-white/60 uppercase">
            {dictionary.plannerMode}
          </span>
          <select
            value={mode}
            onInput={(event) =>
              handleModeChange(event.currentTarget.value as ShareMode)
            }
            class="w-full rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[var(--sun)]"
          >
            <option value="pace">{dictionary.pace}</option>
            <option value="finish">{dictionary.finishTime}</option>
          </select>
        </label>
        <label class="space-y-2">
          <span class="text-xs font-semibold tracking-[0.22em] text-white/60 uppercase">
            {mode === "pace" ? dictionary.pacePerKm : dictionary.finishTime}
          </span>
          <input
            type="text"
            value={value}
            onInput={(event) => setValue(event.currentTarget.value)}
            placeholder={getDefaultShareValue(mode)}
            inputMode="numeric"
            pattern={
              mode === "pace" ? "\\d{1,2}:\\d{2}" : "\\d{1,2}:\\d{2}:\\d{2}"
            }
            class="w-full rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[var(--sun)]"
          />
        </label>
      </div>
      <label class="mt-4 block space-y-2">
        <span class="text-xs font-semibold tracking-[0.22em] text-white/60 uppercase">
          {dictionary.optionalNickname}
        </span>
        <input
          type="text"
          value={name}
          onInput={(event) => setName(event.currentTarget.value)}
          class="w-full rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[var(--sun)]"
        />
      </label>
      <a
        href={href}
        class="mt-5 inline-flex rounded-full bg-[var(--sun)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--sun-deep)]"
      >
        {dictionary.generateShareLink}
      </a>
    </div>
  );
}

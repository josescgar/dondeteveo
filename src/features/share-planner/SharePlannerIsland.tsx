import { useState } from "preact/hooks";

import type { Locale } from "../../lib/config";
import { getDictionary } from "../../lib/i18n";
import type { ShareMode } from "../../lib/share/share-state";
import {
  buildShareHref,
  getDefaultShareValue,
  isValidShareValue,
  maskTimeInput,
} from "./share-planner.logic";

type Props = {
  locale: Locale;
  raceSlug: string;
  year: string;
};

const fieldInputClass =
  "w-full border-b bg-transparent px-0 py-2 font-mono text-sm outline-none transition";
const fieldInputStyle =
  "border-color: var(--color-line-solid); color: var(--color-text);";

export default function SharePlannerIsland({ locale, raceSlug, year }: Props) {
  const dictionary = getDictionary(locale);
  const [mode, setMode] = useState<ShareMode>("pace");
  const [value, setValue] = useState(getDefaultShareValue("pace"));
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleModeChange = (nextMode: ShareMode) => {
    setMode(nextMode);
    setValue(getDefaultShareValue(nextMode));
    setError(null);
  };

  const handleValueFocus = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    input.value = "";
    setValue("");
    setError(null);
  };

  const handleValueInput = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const masked = maskTimeInput(input.value, mode);
    input.value = masked;
    setValue(masked);
    if (error && isValidShareValue(mode, masked)) {
      setError(null);
    }
  };

  const handleLinkClick = (event: Event) => {
    if (isValidShareValue(mode, value)) {
      setError(null);
      return;
    }
    event.preventDefault();
    setError(
      mode === "pace"
        ? dictionary.invalidPaceFormat
        : dictionary.invalidFinishTimeFormat,
    );
  };

  const href = buildShareHref({ locale, raceSlug, year, mode, value, name });

  return (
    <div style="background-color: var(--color-surface); border: 1px solid var(--color-line); padding: 1.5rem;">
      <div
        class="font-mono text-[10px] tracking-[0.3em] uppercase"
        style="color: var(--color-accent);"
      >
        {dictionary.share}
      </div>
      <p
        class="mt-2 font-mono text-sm leading-7"
        style="color: var(--color-muted);"
      >
        {dictionary.shareIntro}
      </p>
      <div class="mt-5 grid gap-4 md:grid-cols-2">
        <label class="flex flex-col gap-1.5">
          <span
            class="font-mono text-[10px] tracking-[0.26em] uppercase"
            style="color: var(--color-muted);"
          >
            {dictionary.plannerMode}
          </span>
          <select
            value={mode}
            onInput={(event) =>
              handleModeChange(event.currentTarget.value as ShareMode)
            }
            class={fieldInputClass}
            style={fieldInputStyle}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-accent)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-line-solid)")
            }
          >
            <option value="pace">{dictionary.pace}</option>
            <option value="finish">{dictionary.finishTime}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1.5">
          <span
            class="font-mono text-[10px] tracking-[0.26em] uppercase"
            style="color: var(--color-muted);"
          >
            {mode === "pace" ? dictionary.pacePerKm : dictionary.finishTime}
          </span>
          <input
            type="text"
            value={value}
            onInput={handleValueInput}
            placeholder={getDefaultShareValue(mode)}
            inputMode="numeric"
            class={fieldInputClass}
            style={fieldInputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--color-accent)";
              handleValueFocus(e);
            }}
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-line-solid)")
            }
          />
          {error && (
            <span
              class="font-mono text-xs"
              style="color: var(--color-coral-deep);"
              role="alert"
            >
              {error}
            </span>
          )}
        </label>
      </div>
      <label class="mt-4 flex flex-col gap-1.5">
        <span
          class="font-mono text-[10px] tracking-[0.26em] uppercase"
          style="color: var(--color-muted);"
        >
          {dictionary.optionalNickname}
        </span>
        <input
          type="text"
          value={name}
          onInput={(event) => setName(event.currentTarget.value)}
          class={fieldInputClass}
          style={fieldInputStyle}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "var(--color-accent)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "var(--color-line-solid)")
          }
        />
      </label>
      <a
        href={href}
        onClick={handleLinkClick}
        class="mt-6 inline-flex px-5 py-2.5 font-mono text-sm tracking-[0.18em] uppercase transition"
        style="background-color: var(--color-coral); color: var(--color-text);"
        onMouseOver={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
            "var(--color-coral-deep)";
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
            "var(--color-coral)";
        }}
      >
        {dictionary.generateShareLink}
      </a>
    </div>
  );
}

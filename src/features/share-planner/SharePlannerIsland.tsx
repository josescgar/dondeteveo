import { useRef, useState } from "preact/hooks";

import type { Locale } from "../../lib/config";
import { getDictionary } from "../../lib/i18n";
import type { ShareMode } from "../../lib/share/share-state";
import {
  buildShareHref,
  getDefaultShareValue,
  isValidShareValue,
  maskTimeInput,
  NICKNAME_MAX_LENGTH,
  validateNickname,
} from "./share-planner.logic";

type Props = {
  locale: Locale;
  raceSlug: string;
  year: string;
};

const fieldInputClass =
  "w-full border-b border-line-solid bg-transparent px-0 py-2 font-mono text-sm text-text outline-none transition focus:border-accent";

export default function SharePlannerIsland({ locale, raceSlug, year }: Props) {
  const dictionary = getDictionary(locale);
  const [mode, setMode] = useState<ShareMode>("pace");
  const [value, setValue] = useState(getDefaultShareValue("pace"));
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const handleModeChange = (nextMode: ShareMode) => {
    setMode(nextMode);
    setValue(getDefaultShareValue(nextMode));
    setError(null);
    setNameError(null);
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

  const handleNameInput = (event: Event) => {
    const next = (event.currentTarget as HTMLInputElement).value;
    setName(next);
    const result = validateNickname(next);
    if (result.valid) {
      setNameError(null);
    } else {
      setNameError(
        result.reason === "invalid-characters"
          ? dictionary.invalidNicknameCharacters
          : dictionary.invalidNicknameLength,
      );
    }
  };

  const handleSubmit = (event: Event) => {
    event.preventDefault();

    if (nameError) return;

    if (!isValidShareValue(mode, value)) {
      setError(
        mode === "pace"
          ? dictionary.invalidPaceFormat
          : dictionary.invalidFinishTimeFormat,
      );
      return;
    }

    setError(null);
    linkRef.current?.click();
  };

  const href = buildShareHref({ locale, raceSlug, year, mode, value, name });

  return (
    <form onSubmit={handleSubmit} class="card-surface">
      <div class="text-accent font-mono text-[10px] tracking-[0.3em] uppercase">
        {dictionary.share}
      </div>
      <p class="text-muted mt-2 font-mono text-sm leading-7">
        {dictionary.shareIntro}
      </p>
      <div class="mt-5 grid gap-4 md:grid-cols-2">
        <label class="flex flex-col gap-1.5">
          <span class="text-muted font-mono text-[10px] tracking-[0.26em] uppercase">
            {dictionary.plannerMode}
          </span>
          <select
            value={mode}
            onInput={(event) =>
              handleModeChange(event.currentTarget.value as ShareMode)
            }
            class={fieldInputClass}
          >
            <option value="pace">{dictionary.pace}</option>
            <option value="finish">{dictionary.finishTime}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-muted font-mono text-[10px] tracking-[0.26em] uppercase">
            {mode === "pace" ? dictionary.pacePerKm : dictionary.finishTime}
          </span>
          <input
            type="text"
            value={value}
            onInput={handleValueInput}
            placeholder={getDefaultShareValue(mode)}
            inputMode="numeric"
            class={fieldInputClass}
            onFocus={handleValueFocus}
          />
          {error && (
            <span class="text-coral-deep font-mono text-xs" role="alert">
              {error}
            </span>
          )}
        </label>
      </div>
      <label class="mt-4 flex flex-col gap-1.5">
        <span class="text-muted font-mono text-[10px] tracking-[0.26em] uppercase">
          {dictionary.optionalNickname}
        </span>
        <input
          type="text"
          value={name}
          maxLength={NICKNAME_MAX_LENGTH}
          onInput={handleNameInput}
          class={fieldInputClass}
        />
        <div class="flex items-baseline justify-between gap-2">
          {nameError ? (
            <span class="text-coral-deep font-mono text-xs" role="alert">
              {nameError}
            </span>
          ) : (
            <span />
          )}
          <span
            class={`shrink-0 font-mono text-[10px] ${name.length === 0 ? "invisible" : ""} ${name.length >= NICKNAME_MAX_LENGTH ? "text-coral-deep" : "text-muted"}`}
          >
            {NICKNAME_MAX_LENGTH - name.length}
          </span>
        </div>
      </label>
      <a
        ref={linkRef}
        href={href}
        class="bg-coral text-text hover:bg-coral-deep mt-6 inline-flex px-5 py-2.5 font-mono text-sm tracking-[0.18em] uppercase transition"
      >
        {dictionary.generateShareLink}
      </a>
      <button type="submit" class="hidden" tabIndex={-1} aria-hidden="true" />
    </form>
  );
}

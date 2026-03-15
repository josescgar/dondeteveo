import { z } from "zod";

import { SHARE_FRAGMENT_KEYS } from "../config";

const shareModeSchema = z.enum(["pace", "finish"]);

const fragmentSchema = z.object({
  mode: shareModeSchema,
  value: z.string().min(1),
  name: z
    .string()
    .trim()
    .max(30)
    .regex(/^[\p{L}\p{N}\s'.-]*$/u)
    .optional(),
  wave: z.coerce.number().int().min(0).optional(),
});

export type ShareMode = z.infer<typeof shareModeSchema>;

export type ShareState = {
  mode: ShareMode;
  value: string;
  name?: string;
  wave?: number;
};

export const serializeShareState = (state: ShareState): string => {
  const params = new URLSearchParams();
  params.set(SHARE_FRAGMENT_KEYS.mode, state.mode);
  params.set(SHARE_FRAGMENT_KEYS.value, state.value);

  if (state.name) {
    params.set(SHARE_FRAGMENT_KEYS.name, state.name);
  }

  if (state.wave !== undefined) {
    params.set(SHARE_FRAGMENT_KEYS.wave, String(state.wave));
  }

  return params.toString();
};

export const parseShareState = (fragment: string): ShareState | null => {
  const normalizedFragment = fragment.startsWith("#")
    ? fragment.slice(1)
    : fragment;
  const params = new URLSearchParams(normalizedFragment);
  const parsed = fragmentSchema.safeParse({
    mode: params.get(SHARE_FRAGMENT_KEYS.mode),
    value: params.get(SHARE_FRAGMENT_KEYS.value),
    name: params.get(SHARE_FRAGMENT_KEYS.name) ?? undefined,
    wave: params.get(SHARE_FRAGMENT_KEYS.wave) ?? undefined,
  });

  if (!parsed.success) {
    return null;
  }

  const isValidTarget =
    parsed.data.mode === "pace"
      ? parsePaceToMinutesPerKm(parsed.data.value) !== null
      : parseFinishTimeToMinutes(parsed.data.value) !== null;

  if (!isValidTarget) {
    return null;
  }

  return parsed.data;
};

export const parseFinishTimeToMinutes = (value: string): number | null => {
  const match = value.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);

  if (minutes >= 60 || seconds >= 60) {
    return null;
  }

  if (hours === 0 && minutes === 0 && seconds === 0) {
    return null;
  }

  return hours * 60 + minutes + seconds / 60;
};

export const parsePaceToMinutesPerKm = (value: string): number | null => {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);

  if (seconds >= 60) {
    return null;
  }

  if (minutes === 0 && seconds === 0) {
    return null;
  }

  return minutes + seconds / 60;
};

export const formatMinutesAsClock = (value: number): string => {
  const wrappedMinutes = Math.floor(value) % 1440;
  const hours = Math.floor(wrappedMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (wrappedMinutes % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}`;
};

export const dayOffsetFromMinutes = (value: number): number =>
  Math.floor(value / 1440);

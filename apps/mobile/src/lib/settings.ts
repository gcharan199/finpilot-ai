/**
 * Persisted app settings.
 *
 * FinPilot is **100% on-device** — there is no API key and no cloud account, so
 * the only secret stored here is the lock PIN. Non-secret prefs (the selected
 * on-device model, theme) also live in `expo-secure-store` for simplicity — it
 * is a tiny KV store and avoids pulling in a second persistence lib.
 *
 * `expo-file-system` is loaded lazily (only when checking whether a downloaded
 * model file exists) so importing this module never requires it in Node.
 */
import * as SecureStore from "expo-secure-store";
import { DEFAULT_ON_DEVICE_MODEL } from "@finpilot/ai-engine";

const KEYS = {
  model: "finpilot.ai.model",
  theme: "finpilot.theme",
  pin: "finpilot.lock.pin",
} as const;

export type ThemeChoice = "light" | "dark" | "system";

async function get(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}
async function set(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

/* ---- On-device model --------------------------------------------------- */

/** The default GGUF model id (overridable in Settings once more are added). */
export const DEFAULT_MODEL = DEFAULT_ON_DEVICE_MODEL;

/** The selected on-device model id (file name). */
export async function getModelId(): Promise<string> {
  return (await get(KEYS.model)) ?? DEFAULT_MODEL;
}
export async function setModelId(id: string): Promise<void> {
  return set(KEYS.model, id);
}

/**
 * Absolute path the model file is expected at on the device. Built from the
 * app's document directory; `null` when `expo-file-system` is unavailable (e.g.
 * Node / a bundle without the native module).
 */
export async function getModelPath(): Promise<string | null> {
  const id = await getModelId();
  try {
    // Literal specifier so Metro bundles expo-file-system (a standard Expo
    // module) — unlike the dev-build-only native AI libs, this resolves fine.
    const FS = (await import("expo-file-system")) as unknown as {
      documentDirectory?: string | null;
    };
    if (!FS.documentDirectory) return null;
    return `${FS.documentDirectory}models/${id}`;
  } catch {
    return null;
  }
}

/**
 * True when the model file has actually been downloaded to the device. Honest
 * status for Settings; returns false whenever `expo-file-system` (a dev-build
 * native module) is not present.
 */
export async function isModelDownloaded(): Promise<boolean> {
  try {
    const FS = (await import("expo-file-system")) as unknown as {
      documentDirectory?: string | null;
      getInfoAsync?: (uri: string) => Promise<{ exists: boolean }>;
    };
    const path = await getModelPath();
    if (!path || !FS.getInfoAsync) return false;
    const info = await FS.getInfoAsync(path);
    return info.exists;
  } catch {
    return false;
  }
}

/* ---- Theme ------------------------------------------------------------- */

export async function getThemeChoice(): Promise<ThemeChoice> {
  const v = await get(KEYS.theme);
  return v === "light" || v === "dark" ? v : "system";
}
export async function setThemeChoice(t: ThemeChoice): Promise<void> {
  return set(KEYS.theme, t);
}

/* ---- Lock PIN ---------------------------------------------------------- */

export async function getPin(): Promise<string | null> {
  return get(KEYS.pin);
}
export async function setPin(pin: string): Promise<void> {
  return set(KEYS.pin, pin);
}
export async function hasPin(): Promise<boolean> {
  return (await get(KEYS.pin)) !== null;
}

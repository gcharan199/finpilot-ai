/**
 * Persisted app settings + secrets.
 *
 * Secrets (the Gemini API key, the lock PIN) live in `expo-secure-store`
 * (Keychain / Keystore). Non-secret prefs (provider choice, theme) also go to
 * secure-store for simplicity — it is a tiny KV store and avoids pulling in a
 * second persistence lib.
 *
 * The Gemini key resolution order is: secure-store value → `EXPO_PUBLIC_GEMINI_API_KEY`
 * dev fallback → none.
 */
import * as SecureStore from "expo-secure-store";

const KEYS = {
  geminiApiKey: "finpilot.gemini.apiKey",
  provider: "finpilot.ai.provider",
  theme: "finpilot.theme",
  pin: "finpilot.lock.pin",
} as const;

export type ProviderChoice = "gemini" | "on-device";
export type ThemeChoice = "light" | "dark" | "system";

async function get(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}
async function set(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}
async function del(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

/* ---- Gemini API key ---------------------------------------------------- */

const ENV_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "";

/** Stored key, else the dev `EXPO_PUBLIC` fallback, else empty string. */
export async function getGeminiApiKey(): Promise<string> {
  const stored = await get(KEYS.geminiApiKey);
  return stored ?? ENV_KEY;
}
export async function setGeminiApiKey(value: string): Promise<void> {
  if (value.trim().length === 0) return del(KEYS.geminiApiKey);
  return set(KEYS.geminiApiKey, value.trim());
}
/** True if a usable key exists from any source. */
export async function hasGeminiApiKey(): Promise<boolean> {
  return (await getGeminiApiKey()).length > 0;
}
export const geminiModel = process.env.EXPO_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";

/* ---- Provider ---------------------------------------------------------- */

export async function getProvider(): Promise<ProviderChoice> {
  const v = await get(KEYS.provider);
  return v === "on-device" ? "on-device" : "gemini";
}
export async function setProvider(p: ProviderChoice): Promise<void> {
  return set(KEYS.provider, p);
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

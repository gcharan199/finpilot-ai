/**
 * AI provider factory for the app.
 *
 * Builds an `AIProvider` from the user's saved provider choice + Gemini key.
 * Gemini calls go straight from the client (see the honesty note in Settings);
 * on-device requires a dev build (documented in docs/on-device.md) and will
 * throw a clear, actionable error in Expo Go / standard exports.
 */
import { createProvider, type AIProvider } from "@finpilot/ai-engine";
import { getGeminiApiKey, geminiModel, getProvider } from "./settings";

/** Resolve the active provider from persisted settings. May throw if a Gemini
 * key is required but missing — callers should surface that to the user. */
export async function getActiveProvider(): Promise<AIProvider> {
  const choice = await getProvider();
  if (choice === "on-device") {
    return createProvider("on-device");
  }
  const apiKey = await getGeminiApiKey();
  return createProvider("gemini", { apiKey, model: geminiModel });
}

/** Friendly message for the common "no key configured" failure. */
export const NO_KEY_MESSAGE =
  "Add a Gemini API key in Settings (or enable on-device in a dev build) to use AI features.";

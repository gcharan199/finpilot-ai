/**
 * On-device AI wiring for the app.
 *
 * FinPilot runs **100% on-device** — there is no cloud provider and no API key.
 * Chat / insight / budget narratives use an on-device LLM (`llama.rn`, GGUF);
 * receipt scanning uses an on-device OCR engine (`@react-native-ml-kit/...`)
 * feeding the pure `parseReceiptText` parser. Both native libs only exist in an
 * EAS dev build, so in Expo Go / a standard export they throw a clear,
 * actionable error (never crash, never call a network).
 */
import {
  createProvider,
  createOcrEngine,
  type AIProvider,
  type OcrEngine,
} from "@finpilot/ai-engine";
import { getModelPath } from "./settings";

/**
 * Resolve the on-device AI provider, wired to the selected model file. The
 * provider throws the documented "needs a dev build + model" error if the
 * native lib or the model file is absent — callers surface that to the user.
 */
export async function getActiveProvider(): Promise<AIProvider> {
  const modelPath = await getModelPath();
  return createProvider("on-device", { modelPath: modelPath ?? undefined });
}

/** Resolve the on-device OCR engine for receipt scanning. */
export function getOcrEngine(): OcrEngine {
  return createOcrEngine("ml-kit");
}

/**
 * Friendly message shown when the on-device AI/OCR native modules (or a model
 * file) are not available — i.e. running in Expo Go or a standard export rather
 * than an EAS dev build.
 */
export const ON_DEVICE_HELP_MESSAGE =
  "Enable on-device AI in a dev build (see docs/on-device.md). Your local finance features keep working without it.";

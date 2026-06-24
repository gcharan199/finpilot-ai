/**
 * @finpilot/ai-engine
 *
 * Provider abstraction for FinPilot's AI features — **100% on-device, no cloud,
 * no API key, no network**. The on-device LLM (`llama.rn`, GGUF) is the only
 * backend; build it with {@link createProvider}. Receipt OCR runs on-device too
 * via the {@link OcrEngine} seam, feeding the pure receipt parser in
 * `@finpilot/finance-engine`.
 */

import type { AIProvider } from "./provider.js";
import { OnDeviceProvider, type OnDeviceOptions } from "./onDevice.js";

/** The only provider kind — an on-device LLM. */
export type ProviderKind = "on-device";

/** Options accepted per provider kind. */
export interface ProviderOptionsMap {
  "on-device": OnDeviceOptions;
}

/**
 * Build an {@link AIProvider}. The on-device LLM is the sole backend.
 *
 * @example
 *   const ai = createProvider("on-device", { modelPath });
 *   const reply = await ai.chat([{ role: "user", content: "How am I doing?" }], ctx);
 */
export function createProvider<K extends ProviderKind>(
  kind: K,
  opts?: ProviderOptionsMap[K],
): AIProvider {
  if (kind === "on-device") {
    return new OnDeviceProvider(opts as OnDeviceOptions);
  }
  // Unreachable today (on-device is the only kind), but keep an explicit guard
  // so adding a future kind without handling it is a clear runtime error.
  throw new Error(`Unknown provider kind: ${String(kind)}`);
}

export type { AIProvider, BudgetGoal, SpendHistory } from "./provider.js";
export type { ChatMessage, FinanceContext } from "./prompts.js";
export {
  FINANCE_SYSTEM_PROMPT,
  buildChatPrompt,
  buildFinanceContextBlock,
  buildReceiptRefinePrompt,
  buildBudgetPrompt,
  buildInsightsPrompt,
} from "./prompts.js";
export {
  categorySchema,
  receiptSchema,
  budgetSchema,
  budgetAllocationSchema,
  insightSchema,
  insightsSchema,
  chatResponseSchema,
  safeParseJson,
  extractJson,
  CATEGORY_VALUES,
  type Receipt,
  type GeneratedBudget,
  type GeneratedInsights,
  type Insight,
  type ChatResponse,
  type SafeParse,
} from "./schemas.js";
export {
  OnDeviceProvider,
  type OnDeviceOptions,
  ON_DEVICE_UNAVAILABLE_MESSAGE,
  DEFAULT_ON_DEVICE_MODEL,
} from "./onDevice.js";
export { FakeProvider, type FakeProviderOverrides } from "./fake.js";
export {
  type OcrEngine,
  type OcrEngineKind,
  MlKitOcrEngine,
  FakeOcrEngine,
  createOcrEngine,
  OCR_UNAVAILABLE_MESSAGE,
} from "./ocr.js";

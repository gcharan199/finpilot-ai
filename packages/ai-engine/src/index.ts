/**
 * @finpilot/ai-engine
 *
 * Provider abstraction for FinPilot's AI features. Pick a backend with
 * {@link createProvider}; all backends satisfy the same {@link AIProvider}
 * interface, so app code is identical regardless of which one is active.
 */

import type { AIProvider } from "./provider.js";
import { GeminiProvider, type GeminiOptions } from "./gemini.js";
import { OnDeviceProvider, type OnDeviceOptions } from "./onDevice.js";

export type ProviderKind = "gemini" | "on-device";

/** Options accepted per provider kind. */
export interface ProviderOptionsMap {
  gemini: GeminiOptions;
  "on-device": OnDeviceOptions;
}

/**
 * Build an {@link AIProvider}.
 *
 * @example
 *   const ai = createProvider("gemini", { apiKey: process.env.GEMINI_API_KEY });
 *   const reply = await ai.chat([{ role: "user", content: "How am I doing?" }], ctx);
 */
export function createProvider<K extends ProviderKind>(
  kind: K,
  opts?: ProviderOptionsMap[K],
): AIProvider {
  switch (kind) {
    case "gemini":
      return new GeminiProvider(opts as GeminiOptions);
    case "on-device":
      return new OnDeviceProvider(opts as OnDeviceOptions);
    default: {
      // Exhaustiveness guard — a new kind must be handled here.
      const _never: never = kind;
      throw new Error(`Unknown provider kind: ${String(_never)}`);
    }
  }
}

export type { AIProvider, BudgetGoal, SpendHistory } from "./provider.js";
export type { ChatMessage, FinanceContext } from "./prompts.js";
export {
  FINANCE_SYSTEM_PROMPT,
  buildChatPrompt,
  buildFinanceContextBlock,
  buildReceiptPrompt,
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
export { GeminiProvider, type GeminiOptions } from "./gemini.js";
export {
  OnDeviceProvider,
  type OnDeviceOptions,
  ON_DEVICE_UNAVAILABLE_MESSAGE,
} from "./onDevice.js";
export { FakeProvider, type FakeProviderOverrides } from "./fake.js";

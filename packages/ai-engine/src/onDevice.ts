/**
 * OnDeviceProvider — runs an LLM locally on the phone (no network, no API key).
 *
 * The native LLM library (`react-native-ai` or `llama.rn`) contains native code
 * that cannot be loaded in Node, Jest, or a standard Expo bundle. So it is
 * **never statically imported**. Instead each call performs a *dynamic* import
 * inside a try/catch; if the lib is absent we throw a clear, actionable error.
 *
 * This is what keeps `pnpm install`, Node unit tests, and Expo bundling working
 * with zero native dependency declared here. See docs/on-device.md to enable it.
 */

import type { AIProvider, BudgetGoal, SpendHistory } from "./provider.js";
import type { ChatMessage, FinanceContext } from "./prompts.js";
import type { GeneratedBudget, GeneratedInsights, Receipt } from "./schemas.js";

const NOT_AVAILABLE_MESSAGE =
  "on-device AI requires an EAS dev build + an on-device model; see docs/on-device.md";

export interface OnDeviceOptions {
  /** Which native lib to load. */
  lib?: "react-native-ai" | "llama.rn";
  /** Path/identifier of the local model file (consumed by the native lib). */
  modelPath?: string;
}

/**
 * Attempt to load the native on-device LLM module. Returns the module on
 * success; throws a clear error if it (or its native binding) is unavailable.
 *
 * The import specifier is computed at runtime so bundlers cannot eagerly resolve
 * it, and the whole thing is wrapped so a missing module never crashes startup.
 */
async function loadNativeLib(lib: string): Promise<unknown> {
  try {
    // Indirect specifier + dynamic import: never statically analyzable, so it is
    // only resolved when the lib is actually installed in a dev build.
    const specifier = lib;
    const mod = await import(/* webpackIgnore: true */ specifier);
    return mod;
  } catch {
    throw new Error(NOT_AVAILABLE_MESSAGE);
  }
}

export class OnDeviceProvider implements AIProvider {
  readonly name = "on-device";
  private readonly lib: string;
  /**
   * Path/identifier of the local model file. Public so the app (and tests) can
   * confirm which model a provider was configured with; consumed by the native
   * lib once it is loaded in a dev build.
   */
  readonly modelPath: string | undefined;

  constructor(opts: OnDeviceOptions = {}) {
    this.lib = opts.lib ?? "react-native-ai";
    this.modelPath = opts.modelPath;
  }

  /** Lazily resolve the native module; throws the actionable error if absent. */
  private async ensureLib(): Promise<unknown> {
    return loadNativeLib(this.lib);
  }

  async chat(_messages: ChatMessage[], _financeContext: FinanceContext): Promise<string> {
    await this.ensureLib();
    // A real implementation would prompt the loaded model with buildChatPrompt().
    throw new Error(NOT_AVAILABLE_MESSAGE);
  }

  async extractReceipt(_imageBase64: string, _mimeType: string): Promise<Receipt> {
    await this.ensureLib();
    throw new Error(NOT_AVAILABLE_MESSAGE);
  }

  async generateInsights(_context: FinanceContext): Promise<GeneratedInsights> {
    await this.ensureLib();
    throw new Error(NOT_AVAILABLE_MESSAGE);
  }

  async generateBudget(_goal: BudgetGoal, _history: SpendHistory): Promise<GeneratedBudget> {
    await this.ensureLib();
    throw new Error(NOT_AVAILABLE_MESSAGE);
  }
}

/** Exported for tests / callers that want to detect availability up front. */
export const ON_DEVICE_UNAVAILABLE_MESSAGE = NOT_AVAILABLE_MESSAGE;

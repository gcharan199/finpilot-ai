/**
 * OnDeviceProvider — runs an LLM locally on the phone (no network, no API key).
 *
 * This is the **only** AI provider. Chat, insight narratives, and budget
 * narratives all run through a quantized GGUF model loaded by `llama.rn` on the
 * device. Nothing ever leaves the phone.
 *
 * The native LLM library (`llama.rn`) contains native code that cannot be loaded
 * in Node, Jest, or a standard Expo bundle. So it is **never statically
 * imported**. Instead the model is initialized lazily via a *dynamic* import
 * inside a try/catch; if the lib (or a model file) is absent we throw a clear,
 * actionable error. This keeps `pnpm install`, Node unit tests, and Expo
 * bundling working with zero native dependency declared here. See
 * docs/on-device.md to enable it on an EAS dev build.
 *
 * Structured outputs (insights, budget) are produced by prompting the model for
 * JSON and parsing the reply through the existing zod schemas (`safeParseJson`),
 * exactly as the cloud provider used to — so downstream code is unchanged.
 */

import type { AIProvider, BudgetGoal, SpendHistory } from "./provider.js";
import type { ChatMessage, FinanceContext } from "./prompts.js";
import {
  buildBudgetPrompt,
  buildChatPrompt,
  buildInsightsPrompt,
} from "./prompts.js";
import {
  budgetSchema,
  insightsSchema,
  safeParseJson,
  type GeneratedBudget,
  type GeneratedInsights,
} from "./schemas.js";

const NOT_AVAILABLE_MESSAGE =
  "on-device AI requires an EAS dev build + an on-device model; see docs/on-device.md";

/** Default model id surfaced in Settings; download/bundle the GGUF for it. */
export const DEFAULT_ON_DEVICE_MODEL = "gemma-3n-2b-it-Q4_K_M.gguf";

export interface OnDeviceOptions {
  /** Which native lib to load. Only `llama.rn` is supported. */
  lib?: "llama.rn";
  /** Path/identifier of the local GGUF model file (consumed by llama.rn). */
  modelPath?: string;
  /** Max tokens to generate per call. */
  maxTokens?: number;
}

/**
 * Minimal slice of the `llama.rn` API we depend on:
 *   `initLlama({ model }) => context`, `context.completion({ messages | prompt })`.
 * Typed loosely because the real module only exists in a dev build.
 */
interface LlamaContext {
  completion(params: {
    messages?: { role: string; content: string }[];
    prompt?: string;
    n_predict?: number;
    stop?: string[];
  }): Promise<{ text: string }>;
}
interface LlamaModule {
  initLlama(params: { model: string; n_ctx?: number }): Promise<LlamaContext>;
}

/**
 * Attempt to load the native on-device LLM module. Returns the module on
 * success; throws a clear error if it (or its native binding) is unavailable.
 *
 * The import specifier is computed at runtime so bundlers cannot eagerly resolve
 * it, and the whole thing is wrapped so a missing module never crashes startup.
 */
async function loadNativeLib(lib: string): Promise<LlamaModule> {
  try {
    // Indirect specifier + dynamic import: never statically analyzable, so it is
    // only resolved when the lib is actually installed in a dev build.
    const specifier = lib;
    const mod = (await import(/* webpackIgnore: true */ specifier)) as LlamaModule;
    return mod;
  } catch {
    throw new Error(NOT_AVAILABLE_MESSAGE);
  }
}

export class OnDeviceProvider implements AIProvider {
  readonly name = "on-device";
  private readonly lib: "llama.rn";
  private readonly maxTokens: number;
  /**
   * Path/identifier of the local GGUF model file. Public so the app (and tests)
   * can confirm which model a provider was configured with; consumed by llama.rn
   * once it is loaded in a dev build.
   */
  readonly modelPath: string | undefined;

  /** Cached llama.rn context, created on first use. */
  private ctx: LlamaContext | null = null;

  constructor(opts: OnDeviceOptions = {}) {
    this.lib = opts.lib ?? "llama.rn";
    this.modelPath = opts.modelPath;
    this.maxTokens = opts.maxTokens ?? 512;
  }

  /**
   * Lazily load the native lib + initialize the model context. Throws the
   * actionable error if either the lib or a model file is absent.
   */
  private async ensureContext(): Promise<LlamaContext> {
    if (this.ctx) return this.ctx;
    if (!this.modelPath) throw new Error(NOT_AVAILABLE_MESSAGE);
    const mod = await loadNativeLib(this.lib);
    try {
      this.ctx = await mod.initLlama({ model: this.modelPath, n_ctx: 4096 });
    } catch {
      throw new Error(NOT_AVAILABLE_MESSAGE);
    }
    return this.ctx;
  }

  /** Run a single completion against the local model and return its text. */
  private async complete(
    system: string,
    user: string,
    stop?: string[],
  ): Promise<string> {
    const ctx = await this.ensureContext();
    const res = await ctx.completion({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      n_predict: this.maxTokens,
      stop,
    });
    return res?.text ?? "";
  }

  async chat(messages: ChatMessage[], financeContext: FinanceContext): Promise<string> {
    const { system, userText } = buildChatPrompt(messages, financeContext);
    return (await this.complete(system, userText)).trim();
  }

  async generateInsights(context: FinanceContext): Promise<GeneratedInsights> {
    const text = await this.complete(
      "You output only valid minified JSON, no prose.",
      buildInsightsPrompt(context),
    );
    const parsed = safeParseJson(text, insightsSchema);
    if (!parsed.success) {
      throw new Error(`Insight generation failed: ${parsed.error}`);
    }
    return parsed.data;
  }

  async generateBudget(goal: BudgetGoal, history: SpendHistory): Promise<GeneratedBudget> {
    const text = await this.complete(
      "You output only valid minified JSON, no prose.",
      buildBudgetPrompt(goal, history),
    );
    const parsed = safeParseJson(text, budgetSchema);
    if (!parsed.success) {
      throw new Error(`Budget generation failed: ${parsed.error}`);
    }
    return parsed.data;
  }
}

/** Exported for tests / callers that want to detect availability up front. */
export const ON_DEVICE_UNAVAILABLE_MESSAGE = NOT_AVAILABLE_MESSAGE;

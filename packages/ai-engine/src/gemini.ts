/**
 * GeminiProvider — AIProvider backed by Google's official `@google/genai` SDK.
 *
 * Confirmed SDK shapes (via context7, googleapis/js-genai):
 *   - client:        `new GoogleGenAI({ apiKey })`
 *   - generation:    `ai.models.generateContent({ model, contents, config })`
 *   - structured:    `config.responseMimeType = "application/json"` (+ optional
 *                     `responseSchema`); `response.text` is the JSON string.
 *   - system prompt: `config.systemInstruction`
 *   - multimodal:    `contents: [{ inlineData: { data: base64, mimeType } }, "text"]`
 *
 * Pure TS — runs in Node. The key comes from `opts.apiKey` or
 * `process.env.GEMINI_API_KEY`. The SDK itself is only imported lazily inside
 * the constructor so merely *importing* this module never requires the package
 * (helps keep unit tests SDK-free; tests use the FakeProvider instead).
 */

import { GoogleGenAI } from "@google/genai";
import type { AIProvider, BudgetGoal, SpendHistory } from "./provider.js";
import type { ChatMessage, FinanceContext } from "./prompts.js";
import {
  buildBudgetPrompt,
  buildChatPrompt,
  buildInsightsPrompt,
  buildReceiptPrompt,
} from "./prompts.js";
import {
  budgetSchema,
  insightsSchema,
  receiptSchema,
  safeParseJson,
  type GeneratedBudget,
  type GeneratedInsights,
  type Receipt,
} from "./schemas.js";

export interface GeminiOptions {
  /** Defaults to `process.env.GEMINI_API_KEY`. */
  apiKey?: string;
  /** Defaults to `process.env.GEMINI_MODEL` or "gemini-2.5-flash". */
  model?: string;
}

const DEFAULT_MODEL = "gemini-2.5-flash";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(opts: GeminiOptions = {}) {
    const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GeminiProvider requires an API key. Set GEMINI_API_KEY or pass { apiKey }.",
      );
    }
    this.model = opts.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
    this.ai = new GoogleGenAI({ apiKey });
  }

  async chat(messages: ChatMessage[], financeContext: FinanceContext): Promise<string> {
    const { system, userText } = buildChatPrompt(messages, financeContext);
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: userText,
      config: { systemInstruction: system },
    });
    return response.text ?? "";
  }

  async extractReceipt(imageBase64: string, mimeType: string): Promise<Receipt> {
    // Multimodal input: an inlineData image Part plus the extraction instruction.
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: [
        { inlineData: { data: imageBase64, mimeType } },
        buildReceiptPrompt(),
      ],
      config: { responseMimeType: "application/json" },
    });
    const parsed = safeParseJson(response.text ?? "", receiptSchema);
    if (!parsed.success) {
      throw new Error(`Receipt extraction failed: ${parsed.error}`);
    }
    return parsed.data;
  }

  async generateInsights(context: FinanceContext): Promise<GeneratedInsights> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: buildInsightsPrompt(context),
      config: { responseMimeType: "application/json" },
    });
    const parsed = safeParseJson(response.text ?? "", insightsSchema);
    if (!parsed.success) {
      throw new Error(`Insight generation failed: ${parsed.error}`);
    }
    return parsed.data;
  }

  async generateBudget(goal: BudgetGoal, history: SpendHistory): Promise<GeneratedBudget> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: buildBudgetPrompt(goal, history),
      config: { responseMimeType: "application/json" },
    });
    const parsed = safeParseJson(response.text ?? "", budgetSchema);
    if (!parsed.success) {
      throw new Error(`Budget generation failed: ${parsed.error}`);
    }
    return parsed.data;
  }
}

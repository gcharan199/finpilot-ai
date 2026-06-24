/**
 * The AIProvider interface — the seam every backend implements.
 *
 * Keeping the app behind this interface means Gemini, an on-device LLM, or a
 * fake test double are all interchangeable. Methods return typed, already-parsed
 * results (validated by the zod schemas in `schemas.ts`).
 */

import type { ChatMessage, FinanceContext } from "./prompts.js";
import type { GeneratedBudget, GeneratedInsights, Receipt } from "./schemas.js";

export type { ChatMessage, FinanceContext } from "./prompts.js";

/** Inputs for budget generation. */
export interface BudgetGoal {
  monthlyIncome: number;
  savingsGoal: number;
}

export type SpendHistory = Array<{ category: string; amount: number }>;

/** The pluggable AI backend. */
export interface AIProvider {
  /** Identifier for logging/telemetry, e.g. "gemini" or "on-device". */
  readonly name: string;

  /**
   * Conversational reply grounded in the user's finance context.
   * @returns the assistant's reply text.
   */
  chat(messages: ChatMessage[], financeContext: FinanceContext): Promise<string>;

  /**
   * Extract structured fields from a receipt image.
   * @param imageBase64 base64-encoded image bytes (no data: prefix).
   * @param mimeType e.g. "image/jpeg" | "image/png".
   */
  extractReceipt(imageBase64: string, mimeType: string): Promise<Receipt>;

  /** Generate short, prioritized insights from a finance snapshot. */
  generateInsights(context: FinanceContext): Promise<GeneratedInsights>;

  /** Generate a budget from a savings goal + recent spend history. */
  generateBudget(goal: BudgetGoal, history: SpendHistory): Promise<GeneratedBudget>;
}

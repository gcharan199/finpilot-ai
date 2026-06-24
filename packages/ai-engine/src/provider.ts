/**
 * The AIProvider interface — the seam every backend implements.
 *
 * Keeping the app behind this interface means the on-device LLM and a fake test
 * double are interchangeable. Methods return typed, already-parsed results
 * (validated by the zod schemas in `schemas.ts`).
 *
 * Receipt OCR is intentionally NOT part of this interface — it lives behind the
 * separate {@link OcrEngine} seam (on-device text recognition) plus the pure
 * `parseReceiptText` parser, so the whole receipt path stays 100% local.
 */

import type { ChatMessage, FinanceContext } from "./prompts.js";
import type { GeneratedBudget, GeneratedInsights } from "./schemas.js";

export type { ChatMessage, FinanceContext } from "./prompts.js";

/** Inputs for budget generation. */
export interface BudgetGoal {
  monthlyIncome: number;
  savingsGoal: number;
}

export type SpendHistory = Array<{ category: string; amount: number }>;

/** The pluggable AI backend. */
export interface AIProvider {
  /** Identifier for logging/telemetry, e.g. "on-device". */
  readonly name: string;

  /**
   * Conversational reply grounded in the user's finance context.
   * @returns the assistant's reply text.
   */
  chat(messages: ChatMessage[], financeContext: FinanceContext): Promise<string>;

  /** Generate short, prioritized insights from a finance snapshot. */
  generateInsights(context: FinanceContext): Promise<GeneratedInsights>;

  /** Generate a budget from a savings goal + recent spend history. */
  generateBudget(goal: BudgetGoal, history: SpendHistory): Promise<GeneratedBudget>;
}

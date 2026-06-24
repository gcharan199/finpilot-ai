/**
 * FakeProvider — a deterministic in-memory AIProvider for tests and local dev.
 *
 * Returns canned but schema-valid results so downstream code (and the mobile
 * app) can be developed and tested without an API key or a network call. All
 * outputs can be overridden via the constructor.
 */

import type { AIProvider, BudgetGoal, SpendHistory } from "./provider.js";
import type { ChatMessage, FinanceContext } from "./prompts.js";
import type { GeneratedBudget, GeneratedInsights, Receipt } from "./schemas.js";

export interface FakeProviderOverrides {
  chat?: string;
  receipt?: Receipt;
  insights?: GeneratedInsights;
  budget?: GeneratedBudget;
}

export class FakeProvider implements AIProvider {
  readonly name = "fake";
  /** Records the last call args so tests can assert on them. */
  readonly calls: { method: string; args: unknown[] }[] = [];

  constructor(private readonly overrides: FakeProviderOverrides = {}) {}

  async chat(messages: ChatMessage[], financeContext: FinanceContext): Promise<string> {
    this.calls.push({ method: "chat", args: [messages, financeContext] });
    const last = messages[messages.length - 1]?.content ?? "";
    return this.overrides.chat ?? `FinPilot here. You asked: "${last}".`;
  }

  async extractReceipt(imageBase64: string, mimeType: string): Promise<Receipt> {
    this.calls.push({ method: "extractReceipt", args: [imageBase64, mimeType] });
    return (
      this.overrides.receipt ?? {
        merchant: "Test Mart",
        amount: 42.5,
        gst: 2.5,
        date: "2026-01-15",
        category: "Groceries",
      }
    );
  }

  async generateInsights(context: FinanceContext): Promise<GeneratedInsights> {
    this.calls.push({ method: "generateInsights", args: [context] });
    return (
      this.overrides.insights ?? {
        insights: [
          { title: "Solid savings", detail: "You're saving consistently.", severity: "info" },
        ],
      }
    );
  }

  async generateBudget(goal: BudgetGoal, history: SpendHistory): Promise<GeneratedBudget> {
    this.calls.push({ method: "generateBudget", args: [goal, history] });
    return (
      this.overrides.budget ?? {
        recommendedSavings: goal.savingsGoal,
        allocations: [{ category: "Groceries", amount: 400 }],
        notes: ["Fake budget for testing."],
      }
    );
  }
}

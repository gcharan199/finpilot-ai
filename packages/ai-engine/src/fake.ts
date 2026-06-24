/**
 * FakeProvider — a deterministic in-memory AIProvider for tests and local dev.
 *
 * Returns canned but schema-valid results so downstream code (and the mobile
 * app) can be developed and tested without an API key or a network call. All
 * outputs can be overridden via the constructor.
 */

import type { AIProvider, BudgetGoal, SpendHistory } from "./provider.js";
import type { ChatMessage, FinanceContext } from "./prompts.js";
import type { GeneratedBudget, GeneratedInsights } from "./schemas.js";

export interface FakeProviderOverrides {
  chat?: string;
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

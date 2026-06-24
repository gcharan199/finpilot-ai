/**
 * Pure prompt builders.
 *
 * No SDK, no IO — just string construction. Kept separate so they can be unit
 * tested and reused by any provider (the on-device LLM, a fake).
 */

/** A finance context blob injected into chat so the model can reason about the user. */
export interface FinanceContext {
  /** 0–100 health score, if available. */
  healthScore?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  savings?: number;
  emergencyFund?: number;
  totalDebt?: number;
  /** Top spending categories this month, highest first. */
  topCategories?: Array<{ category: string; amount: number }>;
  /** Free-form extra notes the app wants the model to know. */
  notes?: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** System instruction that frames the assistant as a careful finance coach. */
export const FINANCE_SYSTEM_PROMPT = [
  "You are FinPilot, a concise and practical personal-finance assistant.",
  "Give specific, actionable guidance grounded in the user's numbers.",
  "Never invent figures that are not in the provided context.",
  "Avoid generic disclaimers; be direct, friendly, and brief.",
  "You are not a licensed financial advisor; for major decisions, suggest professional advice.",
].join(" ");

function formatMoney(n: number | undefined): string {
  return n === undefined ? "n/a" : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Render a {@link FinanceContext} into a compact, model-friendly block. */
export function buildFinanceContextBlock(ctx: FinanceContext): string {
  const lines: string[] = ["[User finance snapshot]"];
  if (ctx.healthScore !== undefined) lines.push(`Health score: ${ctx.healthScore}/100`);
  if (ctx.monthlyIncome !== undefined) lines.push(`Monthly income: ${formatMoney(ctx.monthlyIncome)}`);
  if (ctx.monthlyExpenses !== undefined) lines.push(`Monthly expenses: ${formatMoney(ctx.monthlyExpenses)}`);
  if (ctx.savings !== undefined) lines.push(`Savings: ${formatMoney(ctx.savings)}`);
  if (ctx.emergencyFund !== undefined) lines.push(`Emergency fund: ${formatMoney(ctx.emergencyFund)}`);
  if (ctx.totalDebt !== undefined) lines.push(`Total debt: ${formatMoney(ctx.totalDebt)}`);
  if (ctx.topCategories?.length) {
    const cats = ctx.topCategories
      .map((c) => `${c.category} ${formatMoney(c.amount)}`)
      .join(", ");
    lines.push(`Top spending: ${cats}`);
  }
  if (ctx.notes?.length) lines.push(`Notes: ${ctx.notes.join("; ")}`);
  return lines.join("\n");
}

/**
 * Build the full chat prompt text: system framing + finance context + the
 * conversation so far. Returns the user-turn text and a separate system
 * instruction (providers map these to their own API shape).
 */
export function buildChatPrompt(
  messages: ChatMessage[],
  context: FinanceContext,
): { system: string; userText: string } {
  const contextBlock = buildFinanceContextBlock(context);
  const convo = messages
    .map((m) => `${m.role === "user" ? "User" : "FinPilot"}: ${m.content}`)
    .join("\n");
  const userText = `${contextBlock}\n\n[Conversation]\n${convo}\n\nFinPilot:`;
  return { system: FINANCE_SYSTEM_PROMPT, userText };
}

/**
 * Instruction for refining receipt fields the pure parser already extracted
 * from on-device OCR text. The heuristic parser stands alone; this is an
 * OPTIONAL on-device-LLM refinement step for ambiguous text. No image is sent —
 * only the recognized text, so the whole path stays local.
 */
export function buildReceiptRefinePrompt(ocrText: string): string {
  return [
    "Below is the raw text recognized from a receipt by on-device OCR.",
    "Extract the purchase details. Return JSON with exactly these fields:",
    "- merchant: the store/vendor name (string)",
    "- amount: the grand total paid (number)",
    "- gst: the tax/GST/VAT amount if shown, else 0 (number)",
    "- date: the purchase date in YYYY-MM-DD (string)",
    "- category: the best-fit spending category (string)",
    "If a field is unreadable, use a sensible default (merchant 'Unknown', gst 0).",
    "",
    "[Receipt OCR text]",
    ocrText,
  ].join("\n");
}

/** Instruction for generating a budget from a goal + spend history. */
export function buildBudgetPrompt(
  goal: { monthlyIncome: number; savingsGoal: number },
  history: Array<{ category: string; amount: number }>,
): string {
  const hist = history.length
    ? history.map((h) => `  - ${h.category}: ${formatMoney(h.amount)}/mo`).join("\n")
    : "  (no history provided)";
  return [
    "Create a realistic monthly budget for this user.",
    `Monthly income: ${formatMoney(goal.monthlyIncome)}`,
    `Desired monthly savings: ${formatMoney(goal.savingsGoal)}`,
    "Recent average spend by category:",
    hist,
    "",
    "Return JSON: { recommendedSavings: number, allocations: [{category, amount}], notes: [string] }.",
    "Allocations plus recommendedSavings should not exceed income.",
  ].join("\n");
}

/** Instruction for turning a finance snapshot into a few short insights. */
export function buildInsightsPrompt(context: FinanceContext): string {
  return [
    "Analyze this finance snapshot and produce 2–4 short, specific insights.",
    buildFinanceContextBlock(context),
    "",
    'Return JSON: { insights: [{ title, detail, severity: "info"|"warning"|"critical" }] }.',
  ].join("\n");
}

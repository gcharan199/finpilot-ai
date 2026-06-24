/**
 * Zod schemas for every structured AI output.
 *
 * Models return JSON that is often *almost* right — numbers as strings, missing
 * optional fields, extra keys, an ISO timestamp where a date was asked for.
 * These schemas coerce and validate so downstream code always sees clean,
 * typed data. Use {@link safeParseJson} to parse raw model text safely.
 */

import { z } from "zod";

/** Categories the model is allowed to choose from (mirrors finance-engine). */
export const CATEGORY_VALUES = [
  "Income",
  "Housing",
  "Utilities",
  "Groceries",
  "Dining",
  "Transport",
  "Shopping",
  "Health",
  "Entertainment",
  "Travel",
  "Education",
  "Subscriptions",
  "Savings",
  "Debt",
  "Fees",
  "Other",
] as const;

export const categorySchema = z
  .enum(CATEGORY_VALUES)
  .catch("Other"); // unknown category from the model -> "Other"

/**
 * Coerce a money-ish value to a non-negative number. Accepts numbers or strings
 * like "$1,234.50" / "1.234,50"-free plain decimals; falls back to 0 on junk.
 */
const moneySchema = z
  .union([z.number(), z.string()])
  .transform((v) => {
    if (typeof v === "number") return v;
    // strip currency symbols, spaces, and thousands separators.
    const cleaned = v.replace(/[^0-9.-]/g, "");
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  })
  .pipe(z.number().nonnegative().catch(0));

/** Normalize a date-ish string to yyyy-mm-dd; null when unparseable. */
const dateSchema = z
  .string()
  .transform((v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10); // yyyy-mm-dd
  })
  .nullable()
  .catch(null);

/* -------------------------------------------------------------------------- */
/* Receipt extraction                                                         */
/* -------------------------------------------------------------------------- */

export const receiptSchema = z.object({
  merchant: z.string().min(1).catch("Unknown"),
  amount: moneySchema,
  /** Tax / GST portion of the total, if present. */
  gst: moneySchema.default(0),
  date: dateSchema,
  category: categorySchema,
});

export type Receipt = z.infer<typeof receiptSchema>;

/* -------------------------------------------------------------------------- */
/* Budget generation                                                          */
/* -------------------------------------------------------------------------- */

export const budgetAllocationSchema = z.object({
  category: categorySchema,
  amount: moneySchema,
});

export const budgetSchema = z.object({
  recommendedSavings: moneySchema,
  allocations: z.array(budgetAllocationSchema).default([]),
  notes: z.array(z.string()).default([]),
});

export type GeneratedBudget = z.infer<typeof budgetSchema>;

/* -------------------------------------------------------------------------- */
/* Insights                                                                   */
/* -------------------------------------------------------------------------- */

export const insightSchema = z.object({
  /** A short headline takeaway. */
  title: z.string().min(1).catch("Insight"),
  /** A one-or-two sentence explanation. */
  detail: z.string().default(""),
  /** Optional severity for UI emphasis. */
  severity: z.enum(["info", "warning", "critical"]).catch("info"),
});

export const insightsSchema = z.object({
  insights: z.array(insightSchema).default([]),
});

export type Insight = z.infer<typeof insightSchema>;
export type GeneratedInsights = z.infer<typeof insightsSchema>;

/* -------------------------------------------------------------------------- */
/* Chat                                                                        */
/* -------------------------------------------------------------------------- */

export const chatResponseSchema = z.object({
  reply: z.string(),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

export type SafeParse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Parse raw model text (which is supposed to be JSON) against a schema, without
 * throwing. Tolerates code-fenced JSON (```json ... ```) and leading/trailing
 * prose by extracting the first {...} or [...] block.
 *
 * Generic over the schema (not its output) so that schemas whose *input* and
 * *output* differ — e.g. ones that coerce "12.50" -> 12.5 — return the parsed
 * **output** type, not the looser input type.
 */
export function safeParseJson<S extends z.ZodTypeAny>(
  raw: string,
  schema: S,
): SafeParse<z.infer<S>> {
  const jsonText = extractJson(raw);
  if (jsonText === null) {
    return { success: false, error: "No JSON object/array found in model output." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return { success: false, error: `Invalid JSON: ${(e as Error).message}` };
  }
  const result = schema.safeParse(parsed);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.issues.map((i) => i.message).join("; ") };
}

/** Extract the first JSON object/array from text, stripping code fences. */
export function extractJson(raw: string): string | null {
  const withoutFences = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const firstObj = withoutFences.indexOf("{");
  const firstArr = withoutFences.indexOf("[");
  const candidates = [firstObj, firstArr].filter((i) => i >= 0);
  if (candidates.length === 0) return null;
  const start = Math.min(...candidates);
  const opener = withoutFences[start];
  const closer = opener === "{" ? "}" : "]";
  const end = withoutFences.lastIndexOf(closer);
  if (end <= start) return null;
  return withoutFences.slice(start, end + 1);
}

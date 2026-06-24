/**
 * Budget recommendation
 * ======================
 *
 * Builds a recommended monthly budget from income, a savings goal, and recent
 * per-category spend history. The baseline is the classic **50/30/20 rule**
 * (50% needs, 30% wants, 20% savings), then adjusted toward the user's actual
 * history and savings goal, and flagged for feasibility.
 *
 * Pure and deterministic — no IO.
 */

import type { BudgetAllocation, BudgetRecommendation, Category } from "./types.js";

/** Categories considered essential "needs" (the 50% bucket). */
const NEED_CATEGORIES: readonly Category[] = [
  "Housing",
  "Utilities",
  "Groceries",
  "Transport",
  "Health",
  "Debt",
  "Education",
  "Fees",
];

/** Categories considered discretionary "wants" (the 30% bucket). */
const WANT_CATEGORIES: readonly Category[] = [
  "Dining",
  "Shopping",
  "Entertainment",
  "Travel",
  "Subscriptions",
  "Other",
];

/** 50/30/20 baseline split. */
const BASELINE = { needs: 0.5, wants: 0.3, savings: 0.2 } as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/**
 * Distribute a bucket's total across its categories in proportion to history.
 * If there is no history for the bucket, split it evenly.
 */
function distribute(
  bucketTotal: number,
  categories: readonly Category[],
  history: Partial<Record<Category, number>>,
): BudgetAllocation[] {
  const weights = categories.map((c) => Math.max(0, history[c] ?? 0));
  const totalWeight = sum(weights);

  return categories.map((category, i) => {
    const share =
      totalWeight > 0 ? (weights[i] ?? 0) / totalWeight : 1 / categories.length;
    return { category, amount: round2(bucketTotal * share) };
  });
}

export interface BudgetInput {
  monthlyIncome: number;
  /** Desired monthly savings amount (absolute, major currency units). */
  savingsGoal: number;
  /**
   * Recent average monthly spend per category. Partial — categories absent from
   * history get an even share of their bucket.
   */
  history: Partial<Record<Category, number>>;
}

/**
 * Recommend a monthly budget.
 *
 * Strategy:
 *  1. Start from the 50/30/20 baseline buckets.
 *  2. Honor the savings goal: savings = clamp(goal, 0, income). Whatever income
 *     remains after savings is the spendable pool.
 *  3. Split the spendable pool into needs/wants using the baseline's 50:30 ratio
 *     (5:3), then distribute each bucket across categories by history weight.
 *  4. Feasibility: the goal is feasible if, after funding it, the spendable pool
 *     still covers the user's historical *needs* spend. Otherwise we flag it and
 *     fall back to the largest savings that still covers needs.
 *
 * @returns a {@link BudgetRecommendation}.
 */
export function recommendBudget(input: BudgetInput): BudgetRecommendation {
  const income = Math.max(0, input.monthlyIncome);
  const requestedSavings = Math.max(0, input.savingsGoal);
  const history = input.history;
  const notes: string[] = [];

  // Historical essential spend — the floor we must not starve.
  const historicalNeeds = sum(NEED_CATEGORIES.map((c) => Math.max(0, history[c] ?? 0)));

  let recommendedSavings = Math.min(requestedSavings, income);
  let goalFeasible = true;

  if (income === 0) {
    notes.push("No income provided; all allocations are zero.");
    return {
      monthlyIncome: 0,
      savingsGoal: requestedSavings,
      allocations: [...NEED_CATEGORIES, ...WANT_CATEGORIES].map((category) => ({
        category,
        amount: 0,
      })),
      recommendedSavings: 0,
      goalFeasible: false,
      notes,
    };
  }

  // Spendable pool after funding the savings goal.
  let spendable = income - recommendedSavings;

  // If funding the goal would not leave enough to cover essential spend, the
  // goal is infeasible. Back off savings so needs are covered first.
  if (historicalNeeds > 0 && spendable < historicalNeeds) {
    goalFeasible = false;
    const maxSavingsCoveringNeeds = Math.max(0, income - historicalNeeds);
    recommendedSavings = round2(Math.min(recommendedSavings, maxSavingsCoveringNeeds));
    spendable = income - recommendedSavings;
    notes.push(
      `Savings goal of ${round2(requestedSavings)} leaves too little for essential spend ` +
        `(~${round2(historicalNeeds)}/mo). Recommending ${recommendedSavings} saved instead.`,
    );
  }

  if (recommendedSavings < requestedSavings && goalFeasible) {
    // requestedSavings exceeded income; capped.
    notes.push(`Savings goal exceeds income; capped at income (${income}).`);
  }

  // Split the spendable pool by the baseline needs:wants ratio (50:30 -> 5:3).
  const needsWantsRatioSum = BASELINE.needs + BASELINE.wants; // 0.8
  const needsPool = round2(spendable * (BASELINE.needs / needsWantsRatioSum));
  const wantsPool = round2(spendable * (BASELINE.wants / needsWantsRatioSum));

  const allocations: BudgetAllocation[] = [
    ...distribute(needsPool, NEED_CATEGORIES, history),
    ...distribute(wantsPool, WANT_CATEGORIES, history),
  ];

  const savingsRate = round2((recommendedSavings / income) * 100);
  notes.push(
    `Allocating ${savingsRate}% to savings, with the rest split ~${BASELINE.needs * 100}/` +
      `${BASELINE.wants * 100} across needs and wants, weighted by your spending history.`,
  );

  return {
    monthlyIncome: income,
    savingsGoal: requestedSavings,
    allocations,
    recommendedSavings: round2(recommendedSavings),
    goalFeasible,
    notes,
  };
}

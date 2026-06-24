/**
 * Shared domain types for the FinPilot finance engine.
 *
 * All money is expressed in a single currency's *major units* (e.g. dollars/rupees)
 * as plain `number`s. The engine performs no currency conversion and no IO.
 */

/** A spending/earning category. The set is open — the categorizer maps to these. */
export type Category =
  | "Income"
  | "Housing"
  | "Utilities"
  | "Groceries"
  | "Dining"
  | "Transport"
  | "Shopping"
  | "Health"
  | "Entertainment"
  | "Travel"
  | "Education"
  | "Subscriptions"
  | "Savings"
  | "Debt"
  | "Fees"
  | "Other";

/** All known categories, ordered. Useful for iteration and UI. */
export const CATEGORIES: readonly Category[] = [
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

/** Whether a transaction adds to or subtracts from available money. */
export type TransactionType = "income" | "expense";

/** A single financial transaction. `date` is an ISO-8601 string (yyyy-mm-dd or full). */
export interface Transaction {
  id: string;
  /** Always positive. `type` carries the sign. */
  amount: number;
  type: TransactionType;
  category: Category;
  merchant?: string;
  description?: string;
  /** ISO-8601 date string. */
  date: string;
}

/**
 * A snapshot of a user's finances used to compute the health score.
 * All values are monthly unless noted, in major currency units, and >= 0.
 */
export interface FinancialProfile {
  monthlyIncome: number;
  monthlyExpenses: number;
  /** Total liquid + invested savings (excludes the emergency fund). */
  savings: number;
  /** Cash set aside specifically for emergencies. */
  emergencyFund: number;
  /** Total outstanding debt principal. */
  totalDebt: number;
  /** Sum of required monthly debt repayments (the numerator of DTI). */
  monthlyDebtPayments: number;
}

/** Qualitative band for an overall score. */
export type HealthBand = "Poor" | "Fair" | "Good" | "Excellent";

/** One weighted component of the overall health score. */
export interface SubScore {
  /** 0–100. */
  score: number;
  /** Weight applied to this component in the overall aggregate (0–1). */
  weight: number;
  /** The raw underlying metric (e.g. savings rate as a fraction, DTI, months covered). */
  value: number;
  /** Human-readable explanation of how this component scored. */
  reason: string;
}

/** The four components scored by {@link computeHealthScore}. */
export interface HealthSubScores {
  savingsRate: SubScore;
  expenseRatio: SubScore;
  emergencyFund: SubScore;
  debt: SubScore;
}

/** Full result of a health-score computation. */
export interface HealthScore {
  /** 0–100, weighted aggregate of the sub-scores. */
  overall: number;
  band: HealthBand;
  subScores: HealthSubScores;
  /** Flat list of the most important human-readable takeaways. */
  reasons: string[];
}

/** Budgeting ------------------------------------------------------------- */

/** A recommended monthly spend for one category. */
export interface BudgetAllocation {
  category: Category;
  amount: number;
}

export interface BudgetRecommendation {
  /** The income the budget is based on. */
  monthlyIncome: number;
  /** Target monthly savings the user asked for. */
  savingsGoal: number;
  /** Per-category recommended monthly spend (excludes savings). */
  allocations: BudgetAllocation[];
  /** Amount allocated to savings (>= 0). */
  recommendedSavings: number;
  /**
   * Whether the savings goal fits inside income after essential + reasonable
   * discretionary spend. If false, `recommendedSavings` is the best achievable.
   */
  goalFeasible: boolean;
  /** Human-readable notes about the recommendation. */
  notes: string[];
}

/** Insights -------------------------------------------------------------- */

export type TrendDirection = "up" | "down" | "flat";

/** Month-over-month change for one category. */
export interface CategoryDelta {
  category: Category;
  previous: number;
  current: number;
  /** current - previous (signed). */
  absoluteChange: number;
  /** Fractional change vs previous (e.g. 0.25 = +25%). null when previous is 0. */
  percentChange: number | null;
  direction: TrendDirection;
}

export interface SpendingAnomaly {
  category: Category;
  current: number;
  /** The baseline this was compared against (the previous period's value). */
  baseline: number;
  /** How many times larger than baseline (e.g. 3 = 3x). */
  multiple: number;
  reason: string;
}

export interface InsightReport {
  /** Per-category MoM deltas, every category that appeared in either period. */
  deltas: CategoryDelta[];
  /** Categories whose spend rose the most (by absolute amount), high to low. */
  topIncreases: CategoryDelta[];
  /** Categories whose spend fell the most (by absolute amount), most-negative first. */
  topDecreases: CategoryDelta[];
  /** Categories that spiked unusually vs their own baseline. */
  anomalies: SpendingAnomaly[];
  /** Total spend in the previous period. */
  previousTotal: number;
  /** Total spend in the current period. */
  currentTotal: number;
  /** Overall fractional change in total spend (null when previous total is 0). */
  totalPercentChange: number | null;
}

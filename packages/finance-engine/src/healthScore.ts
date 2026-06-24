/**
 * Financial Health Score
 * =======================
 *
 * Produces a 0–100 score (plus a Poor/Fair/Good/Excellent band) from a
 * {@link FinancialProfile}. The score is a weighted average of four sub-scores,
 * each computed from a well-known personal-finance ratio. Every formula is
 * documented and deterministic — no randomness, no IO.
 *
 * Components and weights (sum to 1.0):
 *   - savingsRate    0.30  — how much of income is saved each month
 *   - expenseRatio   0.20  — how much of income is consumed by expenses
 *   - emergencyFund  0.25  — months of expenses the emergency fund covers
 *   - debt (DTI)     0.25  — share of income going to debt payments
 *
 * Each sub-score is a piecewise-linear mapping from its ratio to 0–100, chosen
 * to match widely-cited healthy thresholds (e.g. >= 20% savings rate is
 * "Excellent", >= 6 months emergency fund is full marks, DTI <= 0.36 is healthy).
 */

import type {
  FinancialProfile,
  HealthBand,
  HealthScore,
  HealthSubScores,
  SubScore,
} from "./types.js";

/** Component weights. Exported so callers/tests can introspect the model. */
export const HEALTH_WEIGHTS = {
  savingsRate: 0.3,
  expenseRatio: 0.2,
  emergencyFund: 0.25,
  debt: 0.25,
} as const;

/** Clamp a number into [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Map a value to 0–100 by linear interpolation between (lo -> 0) and (hi -> 100).
 * Values outside [lo, hi] are clamped. `lo` may be greater than `hi` for
 * "lower is better" metrics (the interpolation handles either direction).
 */
function linearScore(value: number, lo: number, hi: number): number {
  if (lo === hi) return value >= hi ? 100 : 0;
  const t = (value - lo) / (hi - lo);
  return clamp(t * 100, 0, 100);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Savings rate = (income - expenses) / income.
 * Scoring: <= 0% -> 0, >= 20% -> 100, linear between. 20% is the common
 * "excellent saver" benchmark; 0% (or negative) means living beyond your means.
 */
function scoreSavingsRate(p: FinancialProfile): SubScore {
  const weight = HEALTH_WEIGHTS.savingsRate;
  if (p.monthlyIncome <= 0) {
    return {
      score: 0,
      weight,
      value: 0,
      reason: "No income recorded, so no savings rate can be earned.",
    };
  }
  const rate = (p.monthlyIncome - p.monthlyExpenses) / p.monthlyIncome;
  const score = linearScore(rate, 0, 0.2);
  const pct = round(rate * 100);
  let reason: string;
  if (rate <= 0) {
    reason = `Spending meets or exceeds income (savings rate ${pct}%); nothing is being saved.`;
  } else if (rate >= 0.2) {
    reason = `Excellent savings rate of ${pct}% — at or above the 20% benchmark.`;
  } else {
    reason = `Saving ${pct}% of income; aim for 20% to maximise this component.`;
  }
  return { score: round(score), weight, value: round(rate), reason };
}

/**
 * Expense ratio = expenses / income (lower is better).
 * Scoring: >= 100% -> 0, <= 50% -> 100, linear between. Spending half your
 * income or less is ideal; spending all of it earns nothing here.
 */
function scoreExpenseRatio(p: FinancialProfile): SubScore {
  const weight = HEALTH_WEIGHTS.expenseRatio;
  if (p.monthlyIncome <= 0) {
    return {
      score: 0,
      weight,
      value: p.monthlyExpenses > 0 ? Infinity : 0,
      reason: "No income recorded; expenses cannot be supported by income.",
    };
  }
  const ratio = p.monthlyExpenses / p.monthlyIncome;
  // lo=1.0 -> 0, hi=0.5 -> 100 (note lo > hi: lower ratio scores higher).
  const score = linearScore(ratio, 1.0, 0.5);
  const pct = round(ratio * 100);
  let reason: string;
  if (ratio >= 1) {
    reason = `Expenses are ${pct}% of income — at or over budget.`;
  } else if (ratio <= 0.5) {
    reason = `Lean spending: expenses are only ${pct}% of income.`;
  } else {
    reason = `Expenses are ${pct}% of income; under 50% scores full marks here.`;
  }
  return { score: round(score), weight, value: round(ratio), reason };
}

/**
 * Emergency-fund readiness = emergencyFund / monthlyExpenses (months covered).
 * Scoring: 0 months -> 0, >= 6 months -> 100, linear between. Six months of
 * expenses is the standard "fully funded" emergency target.
 *
 * Special case: if there are no monthly expenses but a fund exists, that is
 * effectively infinite runway -> full marks.
 */
function scoreEmergencyFund(p: FinancialProfile): SubScore {
  const weight = HEALTH_WEIGHTS.emergencyFund;
  if (p.monthlyExpenses <= 0) {
    const covered = p.emergencyFund > 0;
    return {
      score: covered ? 100 : 50,
      weight,
      value: covered ? Infinity : 0,
      reason: covered
        ? "No recurring expenses and a cash reserve in place — fully covered."
        : "No expenses and no emergency fund; nothing to cover but no buffer either.",
    };
  }
  const months = p.emergencyFund / p.monthlyExpenses;
  const score = linearScore(months, 0, 6);
  const m = round(months);
  let reason: string;
  if (months >= 6) {
    reason = `Emergency fund covers ${m} months of expenses — fully funded (6+).`;
  } else if (months <= 0) {
    reason = "No emergency fund — one unexpected bill could cause hardship.";
  } else {
    reason = `Emergency fund covers ${m} months; 6 months is the full-marks target.`;
  }
  return { score: round(score), weight, value: m, reason };
}

/**
 * Debt-to-income (DTI) = monthlyDebtPayments / income (lower is better).
 * Scoring: DTI <= 0% -> 100, DTI >= 43% -> 0, linear between. 0.36 is the
 * classic "healthy" lending threshold and 0.43 the qualified-mortgage ceiling;
 * we anchor 0 score at 0.43 so anything above is clearly distressed.
 *
 * Profiles with debt but zero recorded payments are flagged: outstanding debt
 * with no repayment is itself a risk, so the score is capped below perfect.
 */
function scoreDebt(p: FinancialProfile): SubScore {
  const weight = HEALTH_WEIGHTS.debt;
  if (p.monthlyIncome <= 0) {
    const hasDebt = p.totalDebt > 0 || p.monthlyDebtPayments > 0;
    return {
      score: hasDebt ? 0 : 50,
      weight,
      value: hasDebt ? Infinity : 0,
      reason: hasDebt
        ? "Debt obligations with no income to service them."
        : "No income and no debt.",
    };
  }
  const dti = p.monthlyDebtPayments / p.monthlyIncome;
  let score = linearScore(dti, 0.43, 0); // dti 0.43 -> 0, dti 0 -> 100
  const pct = round(dti * 100);

  // Carrying debt principal with zero monthly payment is not "perfect" — cap it.
  if (p.monthlyDebtPayments === 0 && p.totalDebt > 0) {
    score = Math.min(score, 85);
  }

  let reason: string;
  if (p.monthlyDebtPayments === 0 && p.totalDebt > 0) {
    reason = `Outstanding debt of ${round(p.totalDebt)} but no monthly payment recorded — keep chipping away.`;
  } else if (dti <= 0) {
    reason = "Debt-free: no monthly debt payments.";
  } else if (dti <= 0.36) {
    reason = `Healthy DTI of ${pct}% (under the 36% guideline).`;
  } else if (dti < 0.43) {
    reason = `Elevated DTI of ${pct}% — approaching the 43% ceiling.`;
  } else {
    reason = `High DTI of ${pct}% — debt payments are straining the budget.`;
  }
  return { score: round(score), weight, value: round(dti), reason };
}

/** Map an overall 0–100 score to a qualitative band. */
export function bandForScore(overall: number): HealthBand {
  if (overall >= 80) return "Excellent";
  if (overall >= 60) return "Good";
  if (overall >= 40) return "Fair";
  return "Poor";
}

/**
 * Compute the full financial health score for a profile.
 *
 * @param profile monthly figures + balances (all >= 0).
 * @returns overall score, band, the four weighted sub-scores, and top reasons.
 */
export function computeHealthScore(profile: FinancialProfile): HealthScore {
  // Defensive: treat negatives as 0 so the model never produces garbage.
  const p: FinancialProfile = {
    monthlyIncome: Math.max(0, profile.monthlyIncome),
    monthlyExpenses: Math.max(0, profile.monthlyExpenses),
    savings: Math.max(0, profile.savings),
    emergencyFund: Math.max(0, profile.emergencyFund),
    totalDebt: Math.max(0, profile.totalDebt),
    monthlyDebtPayments: Math.max(0, profile.monthlyDebtPayments),
  };

  const subScores: HealthSubScores = {
    savingsRate: scoreSavingsRate(p),
    expenseRatio: scoreExpenseRatio(p),
    emergencyFund: scoreEmergencyFund(p),
    debt: scoreDebt(p),
  };

  const overall =
    subScores.savingsRate.score * subScores.savingsRate.weight +
    subScores.expenseRatio.score * subScores.expenseRatio.weight +
    subScores.emergencyFund.score * subScores.emergencyFund.weight +
    subScores.debt.score * subScores.debt.weight;

  const overallRounded = round(clamp(overall, 0, 100));

  // Surface the weakest two components first (most actionable), then the rest.
  const ordered = [
    subScores.savingsRate,
    subScores.expenseRatio,
    subScores.emergencyFund,
    subScores.debt,
  ].sort((a, b) => a.score - b.score);

  return {
    overall: overallRounded,
    band: bandForScore(overallRounded),
    subScores,
    reasons: ordered.map((s) => s.reason),
  };
}

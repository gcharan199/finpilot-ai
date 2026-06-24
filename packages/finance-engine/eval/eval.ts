/**
 * Health-score evaluation harness
 * ===============================
 *
 * Runs the (pure, API-key-free) health-score model against a labeled set of
 * synthetic financial profiles tagged healthy / moderate / at-risk. It checks:
 *
 *   1. RANKING — the model orders profiles the same way the labels do
 *      (healthy > moderate > at-risk), measured with Spearman-style pairwise
 *      concordance across label tiers.
 *   2. CLASSIFICATION — for profiles with a *clear* expected band, the model's
 *      band matches.
 *
 * It prints a results table and the two metrics, then exits non-zero if either
 * regresses below its threshold. All numbers are computed from the real model —
 * nothing is hard-coded.
 *
 * Run:  pnpm --filter @finpilot/finance-engine eval
 */

import { computeHealthScore } from "../src/healthScore.js";
import type { FinancialProfile, HealthBand } from "../src/types.js";

type Tier = "healthy" | "moderate" | "at-risk";

interface LabeledProfile {
  name: string;
  tier: Tier;
  /** Set only when the band is unambiguous for this profile. */
  expectedBand?: HealthBand;
  profile: FinancialProfile;
}

/** Rank tiers: higher number = financially healthier. */
const TIER_RANK: Record<Tier, number> = { "at-risk": 0, moderate: 1, healthy: 2 };

/**
 * Labeled dataset (9 profiles, 3 per tier). These are realistic synthetic cases,
 * not tuned to game the model — they describe plausible real households.
 */
const DATASET: LabeledProfile[] = [
  // ---- healthy ----
  {
    name: "Saver, debt-free, fully funded",
    tier: "healthy",
    expectedBand: "Excellent",
    profile: {
      monthlyIncome: 6000,
      monthlyExpenses: 3000,
      savings: 40000,
      emergencyFund: 18000, // 6 months
      totalDebt: 0,
      monthlyDebtPayments: 0,
    },
  },
  {
    name: "High earner, modest debt, strong buffer",
    tier: "healthy",
    expectedBand: "Excellent",
    profile: {
      monthlyIncome: 9000,
      monthlyExpenses: 4500,
      savings: 60000,
      emergencyFund: 30000, // ~6.7 months
      totalDebt: 12000,
      monthlyDebtPayments: 900, // DTI 10%
    },
  },
  {
    name: "Frugal household, growing reserves",
    tier: "healthy",
    profile: {
      monthlyIncome: 4000,
      monthlyExpenses: 2200,
      savings: 15000,
      emergencyFund: 13200, // 6 months
      totalDebt: 3000,
      monthlyDebtPayments: 300, // DTI 7.5%
    },
  },

  // ---- moderate ----
  {
    name: "Getting by, thin buffer",
    tier: "moderate",
    profile: {
      monthlyIncome: 5000,
      monthlyExpenses: 4000,
      savings: 6000,
      emergencyFund: 8000, // 2 months
      totalDebt: 15000,
      monthlyDebtPayments: 750, // DTI 15%
    },
  },
  {
    name: "Decent income, elevated DTI",
    tier: "moderate",
    profile: {
      monthlyIncome: 5500,
      monthlyExpenses: 3800,
      savings: 9000,
      emergencyFund: 7600, // 2 months
      totalDebt: 28000,
      monthlyDebtPayments: 1980, // DTI 36%
    },
  },
  {
    name: "Saves a little, little cushion",
    tier: "moderate",
    profile: {
      monthlyIncome: 3500,
      monthlyExpenses: 3000,
      savings: 4000,
      emergencyFund: 4500, // 1.5 months
      totalDebt: 9000,
      monthlyDebtPayments: 525, // DTI 15%
    },
  },

  // ---- at-risk ----
  {
    name: "Living beyond means, no buffer",
    tier: "at-risk",
    expectedBand: "Poor",
    profile: {
      monthlyIncome: 3000,
      monthlyExpenses: 3200, // negative savings rate
      savings: 0,
      emergencyFund: 0,
      totalDebt: 20000,
      monthlyDebtPayments: 1100, // DTI 36.7%
    },
  },
  {
    name: "Crushed by debt",
    tier: "at-risk",
    expectedBand: "Poor",
    profile: {
      monthlyIncome: 4000,
      monthlyExpenses: 3700,
      savings: 200,
      emergencyFund: 500,
      totalDebt: 90000,
      monthlyDebtPayments: 2400, // DTI 60%
    },
  },
  {
    name: "Paycheck-to-paycheck, zero reserves",
    tier: "at-risk",
    expectedBand: "Poor",
    profile: {
      monthlyIncome: 2800,
      monthlyExpenses: 2800, // 0% savings rate
      savings: 0,
      emergencyFund: 0,
      totalDebt: 12000,
      monthlyDebtPayments: 950, // DTI 33.9%
    },
  },
];

/** Threshold gates — drop below these and the eval fails (CI regression guard). */
const RANKING_THRESHOLD = 0.95; // 95% of cross-tier pairs correctly ordered
const CLASSIFICATION_THRESHOLD = 1.0; // every clear-band case must match

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function pad(s: string, width: number): string {
  return s.length >= width ? s.slice(0, width) : s + " ".repeat(width - s.length);
}

function main(): void {
  const scored = DATASET.map((d) => ({
    ...d,
    result: computeHealthScore(d.profile),
  }));

  // ---- Ranking metric: cross-tier pairwise concordance ----
  // For every pair of profiles in *different* tiers, the one in the healthier
  // tier should score strictly higher. Fraction satisfied = ranking accuracy.
  let pairsTotal = 0;
  let pairsCorrect = 0;
  for (let i = 0; i < scored.length; i++) {
    for (let j = i + 1; j < scored.length; j++) {
      const a = scored[i]!;
      const b = scored[j]!;
      if (a.tier === b.tier) continue; // only cross-tier pairs are constrained
      pairsTotal++;
      const rankA = TIER_RANK[a.tier];
      const rankB = TIER_RANK[b.tier];
      const expectedHigher = rankA > rankB ? a : b;
      const expectedLower = rankA > rankB ? b : a;
      if (expectedHigher.result.overall > expectedLower.result.overall) {
        pairsCorrect++;
      }
    }
  }
  const rankingAccuracy = pairsTotal === 0 ? 1 : pairsCorrect / pairsTotal;

  // ---- Classification metric: clear-band match ----
  const clearCases = scored.filter((s) => s.expectedBand !== undefined);
  const bandHits = clearCases.filter((s) => s.result.band === s.expectedBand).length;
  const classificationAccuracy =
    clearCases.length === 0 ? 1 : bandHits / clearCases.length;

  // ---- Print table ----
  const W = { name: 38, tier: 10, score: 7, band: 11, exp: 11 };
  const header =
    pad("Profile", W.name) +
    pad("Tier", W.tier) +
    pad("Score", W.score) +
    pad("Band", W.band) +
    pad("Expected", W.exp);
  console.log("\nFinPilot — Health Score Eval");
  console.log("=".repeat(header.length));
  console.log(header);
  console.log("-".repeat(header.length));

  // Sort the printout by score desc so the ordering is visible at a glance.
  const display = [...scored].sort((a, b) => b.result.overall - a.result.overall);
  for (const s of display) {
    console.log(
      pad(s.name, W.name) +
        pad(s.tier, W.tier) +
        pad(s.result.overall.toFixed(1), W.score) +
        pad(s.result.band, W.band) +
        pad(s.expectedBand ?? "—", W.exp),
    );
  }
  console.log("-".repeat(header.length));

  console.log(`\nDataset size:             ${DATASET.length} profiles (3 per tier)`);
  console.log(
    `Ranking accuracy:         ${pct(rankingAccuracy)} (${pairsCorrect}/${pairsTotal} cross-tier pairs) ` +
      `[threshold ${pct(RANKING_THRESHOLD)}]`,
  );
  console.log(
    `Classification accuracy:  ${pct(classificationAccuracy)} (${bandHits}/${clearCases.length} clear-band cases) ` +
      `[threshold ${pct(CLASSIFICATION_THRESHOLD)}]`,
  );

  // ---- Gate ----
  const failures: string[] = [];
  if (rankingAccuracy < RANKING_THRESHOLD) {
    failures.push(
      `ranking accuracy ${pct(rankingAccuracy)} < threshold ${pct(RANKING_THRESHOLD)}`,
    );
  }
  if (classificationAccuracy < CLASSIFICATION_THRESHOLD) {
    failures.push(
      `classification accuracy ${pct(classificationAccuracy)} < threshold ${pct(
        CLASSIFICATION_THRESHOLD,
      )}`,
    );
  }

  if (failures.length > 0) {
    console.error(`\n❌ EVAL FAILED:\n  - ${failures.join("\n  - ")}\n`);
    process.exit(1);
  }
  console.log("\n✅ EVAL PASSED\n");
}

main();

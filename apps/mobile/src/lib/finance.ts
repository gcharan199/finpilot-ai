/**
 * Finance data layer — bridges `@finpilot/database` aggregates to the
 * `@finpilot/finance-engine` domain logic and the AI `FinanceContext`.
 *
 * These are pure async functions (no React); the TanStack Query hooks in
 * `hooks.ts` wrap them with caching + invalidation.
 */
import {
  aggregatesRepo,
  categoriesRepo,
  transactionsRepo,
  type CategoryRow,
  type TransactionRow,
} from "@finpilot/database";
import {
  computeHealthScore,
  computeInsights,
  type Category,
  type FinancialProfile,
  type HealthScore,
  type InsightReport,
  type Transaction,
} from "@finpilot/finance-engine";
import type { FinanceContext } from "@finpilot/ai-engine";
import { getDb } from "../db";
import { monthKey, previousMonthKey } from "./format";

/** A category-spend row joined to its readable name. */
export interface NamedSpend {
  category: string;
  amount: number;
  count: number;
}

async function categoryNameMap(): Promise<Map<string, CategoryRow>> {
  const db = getDb();
  const cats = await categoriesRepo.list(db);
  return new Map(cats.map((c) => [c.id, c]));
}

/** Spend grouped by category name for a month, highest first. */
export async function spendByCategory(month: string): Promise<NamedSpend[]> {
  const db = getDb();
  const [rows, names] = await Promise.all([
    aggregatesRepo.spendByCategoryForMonth(db, month),
    categoryNameMap(),
  ]);
  return rows
    .map((r) => ({
      category: r.categoryId ? (names.get(r.categoryId)?.name ?? "Other") : "Other",
      amount: r.total,
      count: r.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** Income / expense / net for a month. */
export async function monthTotals(month: string) {
  const db = getDb();
  return aggregatesRepo.monthTotals(db, month);
}

/**
 * Build a {@link FinancialProfile} for the health score from the current
 * month's totals. Savings = positive net this month; emergency fund + debt are
 * estimated from category activity (the app has no separate balances table, so
 * these are honest approximations from transaction data).
 */
export async function buildProfile(month: string): Promise<FinancialProfile> {
  const totals = await monthTotals(month);
  const spend = await spendByCategory(month);
  const byCat = (c: Category) => spend.find((s) => s.category === c)?.amount ?? 0;

  const monthlyIncome = totals.income;
  const monthlyExpenses = totals.expense;
  const savingsThisMonth = Math.max(0, totals.net);
  const savingsContrib = byCat("Savings");

  return {
    monthlyIncome,
    monthlyExpenses,
    savings: savingsThisMonth + savingsContrib,
    // Treat accumulated savings-category spend as the emergency-fund proxy.
    emergencyFund: savingsContrib,
    totalDebt: byCat("Debt") * 12, // rough annualized outstanding proxy
    monthlyDebtPayments: byCat("Debt"),
  };
}

/** The health score for a month. */
export async function healthForMonth(month = monthKey()): Promise<HealthScore> {
  const profile = await buildProfile(month);
  return computeHealthScore(profile);
}

/** Spend totals for the trailing `n` months (oldest first), for trend charts. */
export async function monthlyTrend(
  n = 6,
  endMonth = monthKey(),
): Promise<{ month: string; income: number; expense: number; net: number }[]> {
  const months: string[] = [endMonth];
  for (let i = 1; i < n; i += 1) {
    months.unshift(previousMonthKey(months[0]!));
  }
  const db = getDb();
  const totals = await Promise.all(months.map((m) => aggregatesRepo.monthTotals(db, m)));
  return months.map((month, i) => ({ month, ...totals[i]! }));
}

/** Map DB transaction rows to engine `Transaction`s for `computeInsights`. */
async function toEngineTransactions(month: string): Promise<Transaction[]> {
  const db = getDb();
  const names = await categoryNameMap();
  const rows = await transactionsRepo.list(db, {
    from: `${month}-01`,
    to: nextMonthStart(month),
  });
  return rows.map((r: TransactionRow) => ({
    id: r.id,
    amount: r.amount,
    type: r.type,
    category: (r.categoryId ? names.get(r.categoryId)?.name : "Other") as Category,
    merchant: r.merchant ?? undefined,
    description: r.note ?? undefined,
    date: r.date,
  }));
}

function nextMonthStart(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const ny = m === 12 ? (y ?? 0) + 1 : (y ?? 0);
  const nm = m === 12 ? 1 : (m ?? 1) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

/** Month-over-month insight report (prev vs current). */
export async function insightsForMonth(month = monthKey()): Promise<InsightReport> {
  const prev = previousMonthKey(month);
  const [prevTx, currTx] = await Promise.all([
    toEngineTransactions(prev),
    toEngineTransactions(month),
  ]);
  return computeInsights(prevTx, currTx);
}

/** Build the AI `FinanceContext` from a month's data. */
export async function buildFinanceContext(month = monthKey()): Promise<FinanceContext> {
  const [profile, score, spend] = await Promise.all([
    buildProfile(month),
    healthForMonth(month),
    spendByCategory(month),
  ]);
  return {
    healthScore: score.overall,
    monthlyIncome: profile.monthlyIncome,
    monthlyExpenses: profile.monthlyExpenses,
    savings: profile.savings,
    emergencyFund: profile.emergencyFund,
    totalDebt: profile.totalDebt,
    topCategories: spend.slice(0, 5).map((s) => ({ category: s.category, amount: s.amount })),
  };
}

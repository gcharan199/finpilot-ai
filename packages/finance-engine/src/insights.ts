/**
 * Spending insights
 * =================
 *
 * Compares two periods of transactions and reports month-over-month deltas per
 * category, the top movers, and anomalous spikes. Pure and deterministic.
 */

import type {
  Category,
  CategoryDelta,
  InsightReport,
  SpendingAnomaly,
  Transaction,
  TrendDirection,
} from "./types.js";

/** A spike is flagged when current >= ANOMALY_MULTIPLE * baseline (and material). */
const ANOMALY_MULTIPLE = 2.5;
/** Ignore tiny baselines so a 5 -> 15 blip isn't screamed about. */
const ANOMALY_MIN_CURRENT = 50;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Sum expense amounts per category. Income transactions are excluded. */
function spendByCategory(transactions: Transaction[]): Map<Category, number> {
  const map = new Map<Category, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    map.set(t.category, (map.get(t.category) ?? 0) + Math.max(0, t.amount));
  }
  return map;
}

function direction(absoluteChange: number): TrendDirection {
  if (absoluteChange > 0) return "up";
  if (absoluteChange < 0) return "down";
  return "flat";
}

/**
 * Build a month-over-month insight report.
 *
 * @param previous transactions from the earlier period.
 * @param current  transactions from the later period.
 */
export function computeInsights(
  previous: Transaction[],
  current: Transaction[],
): InsightReport {
  const prevMap = spendByCategory(previous);
  const currMap = spendByCategory(current);

  // Every category that appeared in either period.
  const categories = new Set<Category>([...prevMap.keys(), ...currMap.keys()]);

  const deltas: CategoryDelta[] = [];
  const anomalies: SpendingAnomaly[] = [];

  for (const category of categories) {
    const prev = round2(prevMap.get(category) ?? 0);
    const curr = round2(currMap.get(category) ?? 0);
    const absoluteChange = round2(curr - prev);
    const percentChange = prev > 0 ? round2((curr - prev) / prev) : null;

    deltas.push({
      category,
      previous: prev,
      current: curr,
      absoluteChange,
      percentChange,
      direction: direction(absoluteChange),
    });

    // Anomaly: a material current spend that is a large multiple of its baseline.
    if (prev > 0 && curr >= ANOMALY_MIN_CURRENT && curr >= ANOMALY_MULTIPLE * prev) {
      const multiple = round2(curr / prev);
      anomalies.push({
        category,
        current: curr,
        baseline: prev,
        multiple,
        reason: `${category} spend was ${multiple}x its usual ~${prev}, jumping to ${curr}.`,
      });
    }
  }

  // Sort deltas by absolute change for "top movers".
  const byChangeDesc = [...deltas].sort((a, b) => b.absoluteChange - a.absoluteChange);
  const topIncreases = byChangeDesc.filter((d) => d.absoluteChange > 0).slice(0, 5);
  const topDecreases = byChangeDesc
    .filter((d) => d.absoluteChange < 0)
    .reverse()
    .slice(0, 5);

  const previousTotal = round2([...prevMap.values()].reduce((a, b) => a + b, 0));
  const currentTotal = round2([...currMap.values()].reduce((a, b) => a + b, 0));
  const totalPercentChange =
    previousTotal > 0 ? round2((currentTotal - previousTotal) / previousTotal) : null;

  // Deterministic output order: deltas sorted by current spend desc, then name.
  deltas.sort((a, b) => b.current - a.current || a.category.localeCompare(b.category));
  anomalies.sort((a, b) => b.multiple - a.multiple);

  return {
    deltas,
    topIncreases,
    topDecreases,
    anomalies,
    previousTotal,
    currentTotal,
    totalPercentChange,
  };
}

import { computeInsights } from "../insights.js";
import type { Transaction } from "../types.js";

let idCounter = 0;
function tx(category: Transaction["category"], amount: number, type: Transaction["type"] = "expense"): Transaction {
  return {
    id: `t${idCounter++}`,
    amount,
    type,
    category,
    date: "2026-01-01",
  };
}

describe("computeInsights", () => {
  it("computes per-category deltas with direction and percent", () => {
    const prev = [tx("Groceries", 400), tx("Dining", 200)];
    const curr = [tx("Groceries", 500), tx("Dining", 100)];
    const r = computeInsights(prev, curr);

    const groceries = r.deltas.find((d) => d.category === "Groceries")!;
    expect(groceries.previous).toBe(400);
    expect(groceries.current).toBe(500);
    expect(groceries.absoluteChange).toBe(100);
    expect(groceries.percentChange).toBeCloseTo(0.25, 5);
    expect(groceries.direction).toBe("up");

    const dining = r.deltas.find((d) => d.category === "Dining")!;
    expect(dining.direction).toBe("down");
    expect(dining.percentChange).toBeCloseTo(-0.5, 5);
  });

  it("excludes income transactions from spend", () => {
    const prev = [tx("Income", 5000, "income"), tx("Groceries", 300)];
    const curr = [tx("Income", 5200, "income"), tx("Groceries", 350)];
    const r = computeInsights(prev, curr);
    expect(r.deltas.find((d) => d.category === "Income")).toBeUndefined();
    expect(r.previousTotal).toBe(300);
    expect(r.currentTotal).toBe(350);
  });

  it("returns null percentChange when the previous value is 0 (new category)", () => {
    const prev: Transaction[] = [];
    const curr = [tx("Travel", 1200)];
    const r = computeInsights(prev, curr);
    const travel = r.deltas.find((d) => d.category === "Travel")!;
    expect(travel.previous).toBe(0);
    expect(travel.percentChange).toBeNull();
    expect(travel.direction).toBe("up");
  });

  it("flags an anomaly when spend spikes >= 2.5x a material baseline", () => {
    const prev = [tx("Shopping", 100)];
    const curr = [tx("Shopping", 400)]; // 4x and >= 50
    const r = computeInsights(prev, curr);
    expect(r.anomalies).toHaveLength(1);
    expect(r.anomalies[0]!.category).toBe("Shopping");
    expect(r.anomalies[0]!.multiple).toBe(4);
  });

  it("does not flag a spike from a tiny baseline below the material threshold", () => {
    const prev = [tx("Fees", 5)];
    const curr = [tx("Fees", 20)]; // 4x but only 20 (< 50 material floor)
    const r = computeInsights(prev, curr);
    expect(r.anomalies).toHaveLength(0);
  });

  it("identifies top increases and decreases", () => {
    const prev = [tx("Housing", 1500), tx("Dining", 300), tx("Travel", 0)];
    const curr = [tx("Housing", 1500), tx("Dining", 600), tx("Travel", 200)];
    const r = computeInsights(prev, curr);
    expect(r.topIncreases[0]!.category).toBe("Dining"); // +300, biggest
    expect(r.topIncreases.every((d) => d.absoluteChange > 0)).toBe(true);
    expect(r.topDecreases.every((d) => d.absoluteChange < 0)).toBe(true);
  });

  it("handles two empty periods", () => {
    const r = computeInsights([], []);
    expect(r.deltas).toHaveLength(0);
    expect(r.previousTotal).toBe(0);
    expect(r.currentTotal).toBe(0);
    expect(r.totalPercentChange).toBeNull();
    expect(r.anomalies).toHaveLength(0);
  });

  it("computes total percent change across periods", () => {
    const prev = [tx("Groceries", 400), tx("Dining", 100)]; // 500
    const curr = [tx("Groceries", 500), tx("Dining", 250)]; // 750
    const r = computeInsights(prev, curr);
    expect(r.previousTotal).toBe(500);
    expect(r.currentTotal).toBe(750);
    expect(r.totalPercentChange).toBeCloseTo(0.5, 5);
  });
});

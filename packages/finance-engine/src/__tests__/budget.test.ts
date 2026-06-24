import { recommendBudget } from "../budget.js";
import type { Category } from "../types.js";

function totalOf(allocations: { amount: number }[]): number {
  return allocations.reduce((a, b) => a + b.amount, 0);
}

describe("recommendBudget", () => {
  it("funds the savings goal and spends the rest when feasible", () => {
    const r = recommendBudget({
      monthlyIncome: 5000,
      savingsGoal: 1000,
      history: { Housing: 1500, Groceries: 400, Dining: 300 },
    });
    expect(r.goalFeasible).toBe(true);
    expect(r.recommendedSavings).toBe(1000);
    // savings + all allocations should reconcile to income (within rounding).
    expect(r.recommendedSavings + totalOf(r.allocations)).toBeCloseTo(5000, 0);
  });

  it("distributes a bucket by history weight", () => {
    const r = recommendBudget({
      monthlyIncome: 4000,
      savingsGoal: 800,
      // Within needs: Housing dominates, so it should get the biggest needs slice.
      history: { Housing: 2000, Groceries: 200 },
    });
    const housing = r.allocations.find((a) => a.category === "Housing")!;
    const groceries = r.allocations.find((a) => a.category === "Groceries")!;
    expect(housing.amount).toBeGreaterThan(groceries.amount);
  });

  it("splits a bucket evenly when there is no history for it", () => {
    const r = recommendBudget({
      monthlyIncome: 3000,
      savingsGoal: 600,
      history: {}, // empty
    });
    // All want categories share equally; pick two and compare.
    const dining = r.allocations.find((a) => a.category === "Dining")!;
    const shopping = r.allocations.find((a) => a.category === "Shopping")!;
    expect(dining.amount).toBeCloseTo(shopping.amount, 2);
  });

  it("flags an infeasible goal and backs off savings to cover needs", () => {
    const r = recommendBudget({
      monthlyIncome: 3000,
      savingsGoal: 2500, // leaves only 500 — far below needs
      history: { Housing: 1800, Groceries: 400 }, // needs ~2200
    });
    expect(r.goalFeasible).toBe(false);
    // Must leave at least historical needs (2200) for spending.
    expect(r.recommendedSavings).toBeLessThanOrEqual(3000 - 2200);
    expect(r.notes.join(" ")).toMatch(/too little/i);
  });

  it("caps a savings goal that exceeds income", () => {
    const r = recommendBudget({ monthlyIncome: 2000, savingsGoal: 5000, history: {} });
    expect(r.recommendedSavings).toBeLessThanOrEqual(2000);
  });

  it("returns all-zero allocations for zero income", () => {
    const r = recommendBudget({ monthlyIncome: 0, savingsGoal: 500, history: {} });
    expect(r.recommendedSavings).toBe(0);
    expect(r.goalFeasible).toBe(false);
    expect(totalOf(r.allocations)).toBe(0);
  });

  it("handles a zero savings goal (spends everything)", () => {
    const r = recommendBudget({ monthlyIncome: 4000, savingsGoal: 0, history: {} });
    expect(r.recommendedSavings).toBe(0);
    expect(totalOf(r.allocations)).toBeCloseTo(4000, 0);
  });

  it("never produces negative allocations", () => {
    const cats: Category[] = ["Housing", "Dining", "Travel"];
    const r = recommendBudget({
      monthlyIncome: 6000,
      savingsGoal: 1200,
      history: { Housing: 2000, Dining: 500, Travel: 800 },
    });
    for (const c of cats) {
      const alloc = r.allocations.find((a) => a.category === c)!;
      expect(alloc.amount).toBeGreaterThanOrEqual(0);
    }
  });
});

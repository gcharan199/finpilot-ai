import { computeHealthScore, bandForScore, HEALTH_WEIGHTS } from "../healthScore.js";
import type { FinancialProfile } from "../types.js";

const base: FinancialProfile = {
  monthlyIncome: 5000,
  monthlyExpenses: 3000,
  savings: 10000,
  emergencyFund: 18000, // 6 months of expenses
  totalDebt: 0,
  monthlyDebtPayments: 0,
};

describe("computeHealthScore", () => {
  it("weights sum to 1", () => {
    const total =
      HEALTH_WEIGHTS.savingsRate +
      HEALTH_WEIGHTS.expenseRatio +
      HEALTH_WEIGHTS.emergencyFund +
      HEALTH_WEIGHTS.debt;
    expect(total).toBeCloseTo(1, 10);
  });

  it("scores a strong profile as Excellent", () => {
    const r = computeHealthScore(base);
    expect(r.overall).toBeGreaterThanOrEqual(80);
    expect(r.band).toBe("Excellent");
    expect(r.reasons.length).toBe(4);
  });

  it("clamps overall to 0..100 and keeps sub-scores in range", () => {
    const r = computeHealthScore(base);
    expect(r.overall).toBeGreaterThanOrEqual(0);
    expect(r.overall).toBeLessThanOrEqual(100);
    for (const sub of Object.values(r.subScores)) {
      expect(sub.score).toBeGreaterThanOrEqual(0);
      expect(sub.score).toBeLessThanOrEqual(100);
    }
  });

  describe("savings rate", () => {
    it("is 0 when income is 0", () => {
      const r = computeHealthScore({ ...base, monthlyIncome: 0 });
      expect(r.subScores.savingsRate.score).toBe(0);
      expect(r.subScores.savingsRate.reason).toMatch(/no income/i);
    });

    it("is 100 at >= 20% savings rate", () => {
      const r = computeHealthScore({ ...base, monthlyIncome: 5000, monthlyExpenses: 4000 });
      expect(r.subScores.savingsRate.score).toBe(100);
    });

    it("is 0 when spending exceeds income", () => {
      const r = computeHealthScore({ ...base, monthlyIncome: 3000, monthlyExpenses: 4000 });
      expect(r.subScores.savingsRate.score).toBe(0);
    });

    it("interpolates linearly at 10% rate -> 50", () => {
      const r = computeHealthScore({ ...base, monthlyIncome: 5000, monthlyExpenses: 4500 });
      expect(r.subScores.savingsRate.score).toBeCloseTo(50, 5);
    });
  });

  describe("expense ratio", () => {
    it("is 100 at <= 50% of income", () => {
      const r = computeHealthScore({ ...base, monthlyIncome: 5000, monthlyExpenses: 2500 });
      expect(r.subScores.expenseRatio.score).toBe(100);
    });

    it("is 0 when expenses equal income", () => {
      const r = computeHealthScore({ ...base, monthlyIncome: 5000, monthlyExpenses: 5000 });
      expect(r.subScores.expenseRatio.score).toBe(0);
    });

    it("reports Infinity value when income is 0 but expenses exist", () => {
      const r = computeHealthScore({ ...base, monthlyIncome: 0, monthlyExpenses: 1000 });
      expect(r.subScores.expenseRatio.value).toBe(Infinity);
      expect(r.subScores.expenseRatio.score).toBe(0);
    });
  });

  describe("emergency fund", () => {
    it("is 100 at 6+ months covered", () => {
      const r = computeHealthScore({ ...base, monthlyExpenses: 3000, emergencyFund: 18000 });
      expect(r.subScores.emergencyFund.score).toBe(100);
    });

    it("is 0 with no fund", () => {
      const r = computeHealthScore({ ...base, emergencyFund: 0 });
      expect(r.subScores.emergencyFund.score).toBe(0);
    });

    it("interpolates: 3 months -> 50", () => {
      const r = computeHealthScore({ ...base, monthlyExpenses: 3000, emergencyFund: 9000 });
      expect(r.subScores.emergencyFund.score).toBeCloseTo(50, 5);
    });

    it("gives full marks when there are no expenses but a fund exists", () => {
      const r = computeHealthScore({ ...base, monthlyExpenses: 0, emergencyFund: 1000 });
      expect(r.subScores.emergencyFund.score).toBe(100);
      expect(r.subScores.emergencyFund.value).toBe(Infinity);
    });
  });

  describe("debt (DTI)", () => {
    it("is 100 when debt-free", () => {
      const r = computeHealthScore({ ...base, totalDebt: 0, monthlyDebtPayments: 0 });
      expect(r.subScores.debt.score).toBe(100);
      expect(r.subScores.debt.reason).toMatch(/debt-free/i);
    });

    it("is 0 at DTI >= 43%", () => {
      const r = computeHealthScore({
        ...base,
        monthlyIncome: 5000,
        monthlyDebtPayments: 2150, // 43%
        totalDebt: 50000,
      });
      expect(r.subScores.debt.score).toBe(0);
    });

    it("handles a huge debt load -> Poor overall", () => {
      const r = computeHealthScore({
        monthlyIncome: 4000,
        monthlyExpenses: 3800,
        savings: 0,
        emergencyFund: 0,
        totalDebt: 80000,
        monthlyDebtPayments: 2500, // DTI 62.5%
      });
      expect(r.subScores.debt.score).toBe(0);
      expect(r.band).toBe("Poor");
    });

    it("caps score below perfect when debt exists but no payment is recorded", () => {
      const r = computeHealthScore({
        ...base,
        totalDebt: 20000,
        monthlyDebtPayments: 0,
      });
      expect(r.subScores.debt.score).toBeLessThanOrEqual(85);
      expect(r.subScores.debt.reason).toMatch(/no monthly payment/i);
    });

    it("treats debt with no income as worst-case", () => {
      const r = computeHealthScore({
        monthlyIncome: 0,
        monthlyExpenses: 0,
        savings: 0,
        emergencyFund: 0,
        totalDebt: 10000,
        monthlyDebtPayments: 500,
      });
      expect(r.subScores.debt.score).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles an all-zero profile without throwing", () => {
      const r = computeHealthScore({
        monthlyIncome: 0,
        monthlyExpenses: 0,
        savings: 0,
        emergencyFund: 0,
        totalDebt: 0,
        monthlyDebtPayments: 0,
      });
      expect(Number.isFinite(r.overall)).toBe(true);
      expect(r.overall).toBeGreaterThanOrEqual(0);
      expect(r.overall).toBeLessThanOrEqual(100);
    });

    it("treats negative inputs as zero (defensive)", () => {
      const r = computeHealthScore({
        monthlyIncome: -100,
        monthlyExpenses: -50,
        savings: -10,
        emergencyFund: -10,
        totalDebt: -10,
        monthlyDebtPayments: -10,
      });
      expect(Number.isFinite(r.overall)).toBe(true);
    });
  });
});

describe("bandForScore", () => {
  it.each([
    [0, "Poor"],
    [39.9, "Poor"],
    [40, "Fair"],
    [59.9, "Fair"],
    [60, "Good"],
    [79.9, "Good"],
    [80, "Excellent"],
    [100, "Excellent"],
  ])("maps %d -> %s", (score, band) => {
    expect(bandForScore(score as number)).toBe(band);
  });
});

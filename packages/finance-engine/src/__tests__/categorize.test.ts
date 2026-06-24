import { categorize, DEFAULT_CATEGORY_RULES } from "../categorize.js";

describe("categorize", () => {
  it("matches a known merchant", () => {
    expect(categorize({ merchant: "Starbucks Coffee #123" })).toBe("Dining");
    expect(categorize({ merchant: "NETFLIX.COM" })).toBe("Subscriptions");
    expect(categorize({ merchant: "Uber Trip" })).toBe("Transport");
  });

  it("is case-insensitive and matches inside descriptions", () => {
    expect(categorize({ description: "monthly RENT to landlord" })).toBe("Housing");
    expect(categorize({ description: "AMAZON marketplace order" })).toBe("Shopping");
  });

  it("prefers the most specific (longest) keyword", () => {
    // "whole foods" (Groceries) should beat a hypothetical generic match.
    expect(categorize({ merchant: "Whole Foods Market" })).toBe("Groceries");
    // "uber eats" (Dining) is more specific than "uber" (Transport).
    expect(categorize({ merchant: "UBER EATS delivery" })).toBe("Dining");
  });

  it("falls back to Other when nothing matches", () => {
    expect(categorize({ merchant: "Zxqwv Unknown LLC" })).toBe("Other");
  });

  it("returns the fallback for empty input", () => {
    expect(categorize({})).toBe("Other");
    expect(categorize({ merchant: "   " })).toBe("Other");
  });

  it("honors a custom fallback", () => {
    expect(categorize({ merchant: "nothing here" }, { fallback: "Fees" })).toBe("Fees");
  });

  it("merges custom rules over the defaults", () => {
    expect(
      categorize({ merchant: "MyLocalChai" }, { rules: { mylocalchai: "Dining" } }),
    ).toBe("Dining");
    // defaults still apply when not overridden
    expect(categorize({ merchant: "spotify" }, { rules: { foo: "Other" } })).toBe(
      "Subscriptions",
    );
  });

  it("classifies income keywords as Income", () => {
    expect(categorize({ description: "ACME Corp PAYROLL deposit" })).toBe("Income");
  });

  it("has only valid categories in the default rule map", () => {
    const valid = new Set([
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
    ]);
    for (const category of Object.values(DEFAULT_CATEGORY_RULES)) {
      expect(valid.has(category)).toBe(true);
    }
  });
});

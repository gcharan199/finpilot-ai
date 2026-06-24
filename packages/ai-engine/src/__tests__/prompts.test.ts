import {
  buildChatPrompt,
  buildFinanceContextBlock,
  buildReceiptRefinePrompt,
  buildBudgetPrompt,
  buildInsightsPrompt,
  FINANCE_SYSTEM_PROMPT,
} from "../prompts.js";

describe("buildFinanceContextBlock", () => {
  it("includes only the fields that are present", () => {
    const block = buildFinanceContextBlock({ healthScore: 72, monthlyIncome: 5000 });
    expect(block).toContain("Health score: 72/100");
    expect(block).toContain("Monthly income: 5,000");
    expect(block).not.toContain("Total debt");
  });

  it("renders top categories", () => {
    const block = buildFinanceContextBlock({
      topCategories: [
        { category: "Housing", amount: 1500 },
        { category: "Dining", amount: 400 },
      ],
    });
    expect(block).toContain("Top spending: Housing 1,500, Dining 400");
  });
});

describe("buildChatPrompt", () => {
  it("returns the system prompt and a user text with context + conversation", () => {
    const { system, userText } = buildChatPrompt(
      [
        { role: "user", content: "Can I afford a vacation?" },
        { role: "assistant", content: "Let's check." },
        { role: "user", content: "I have 2000 saved." },
      ],
      { healthScore: 65, savings: 2000 },
    );
    expect(system).toBe(FINANCE_SYSTEM_PROMPT);
    expect(userText).toContain("Health score: 65/100");
    expect(userText).toContain("User: Can I afford a vacation?");
    expect(userText).toContain("FinPilot: Let's check.");
    expect(userText.trimEnd().endsWith("FinPilot:")).toBe(true);
  });
});

describe("buildReceiptRefinePrompt", () => {
  it("asks for the required structured fields and embeds the OCR text", () => {
    const p = buildReceiptRefinePrompt("WHOLE FOODS\nTOTAL 54.20");
    for (const field of ["merchant", "amount", "gst", "date", "category"]) {
      expect(p).toContain(field);
    }
    expect(p).toContain("YYYY-MM-DD");
    expect(p).toContain("WHOLE FOODS");
    expect(p).toContain("TOTAL 54.20");
  });
});

describe("buildBudgetPrompt", () => {
  it("embeds income, goal, and history", () => {
    const p = buildBudgetPrompt(
      { monthlyIncome: 6000, savingsGoal: 1000 },
      [{ category: "Housing", amount: 2000 }],
    );
    expect(p).toContain("Monthly income: 6,000");
    expect(p).toContain("Desired monthly savings: 1,000");
    expect(p).toContain("Housing: 2,000");
  });

  it("handles empty history", () => {
    const p = buildBudgetPrompt({ monthlyIncome: 3000, savingsGoal: 0 }, []);
    expect(p).toContain("(no history provided)");
  });
});

describe("buildInsightsPrompt", () => {
  it("includes the context block and asks for JSON insights", () => {
    const p = buildInsightsPrompt({ healthScore: 50 });
    expect(p).toContain("Health score: 50/100");
    expect(p).toContain("insights");
    expect(p).toContain("severity");
  });
});

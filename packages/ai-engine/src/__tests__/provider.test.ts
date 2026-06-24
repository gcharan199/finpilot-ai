import { createProvider } from "../index.js";
import { FakeProvider } from "../fake.js";
import { OnDeviceProvider, ON_DEVICE_UNAVAILABLE_MESSAGE } from "../onDevice.js";
import { receiptSchema, budgetSchema, insightsSchema } from "../schemas.js";

describe("createProvider factory", () => {
  it("builds an on-device provider", () => {
    const p = createProvider("on-device");
    expect(p.name).toBe("on-device");
    expect(p).toBeInstanceOf(OnDeviceProvider);
  });

  it("throws when building gemini without an API key", () => {
    const prev = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    expect(() => createProvider("gemini")).toThrow(/api key/i);
    if (prev !== undefined) process.env.GEMINI_API_KEY = prev;
  });

  it("builds a gemini provider when a key is supplied (no network call)", () => {
    const p = createProvider("gemini", { apiKey: "test-key-not-used" });
    expect(p.name).toBe("gemini");
  });
});

describe("OnDeviceProvider", () => {
  // The native lib is intentionally absent in Node, so every method should throw
  // the clear, documented error rather than crash on a static import.
  it("throws the actionable error for chat", async () => {
    const p = new OnDeviceProvider();
    await expect(p.chat([{ role: "user", content: "hi" }], {})).rejects.toThrow(
      ON_DEVICE_UNAVAILABLE_MESSAGE,
    );
  });

  it("throws the actionable error for receipt extraction", async () => {
    const p = new OnDeviceProvider({ lib: "llama.rn" });
    await expect(p.extractReceipt("base64", "image/png")).rejects.toThrow(
      /EAS dev build/i,
    );
  });

  it("throws for insights and budget too", async () => {
    const p = new OnDeviceProvider();
    await expect(p.generateInsights({})).rejects.toThrow(ON_DEVICE_UNAVAILABLE_MESSAGE);
    await expect(
      p.generateBudget({ monthlyIncome: 1000, savingsGoal: 100 }, []),
    ).rejects.toThrow(ON_DEVICE_UNAVAILABLE_MESSAGE);
  });
});

describe("FakeProvider", () => {
  it("returns schema-valid results for every method", async () => {
    const p = new FakeProvider();

    const reply = await p.chat([{ role: "user", content: "How am I doing?" }], {
      healthScore: 70,
    });
    expect(typeof reply).toBe("string");
    expect(reply).toContain("How am I doing?");

    const receipt = await p.extractReceipt("b64", "image/jpeg");
    expect(receiptSchema.safeParse(receipt).success).toBe(true);

    const insights = await p.generateInsights({ healthScore: 70 });
    expect(insightsSchema.safeParse(insights).success).toBe(true);

    const budget = await p.generateBudget(
      { monthlyIncome: 5000, savingsGoal: 1000 },
      [{ category: "Housing", amount: 1500 }],
    );
    expect(budgetSchema.safeParse(budget).success).toBe(true);
    expect(budget.recommendedSavings).toBe(1000);
  });

  it("honors overrides and records calls", async () => {
    const p = new FakeProvider({ chat: "canned reply" });
    const reply = await p.chat([{ role: "user", content: "anything" }], {});
    expect(reply).toBe("canned reply");
    expect(p.calls).toHaveLength(1);
    expect(p.calls[0]!.method).toBe("chat");
  });

  it("returns a receipt with the expected field shape", async () => {
    const p = new FakeProvider();
    const r = await p.extractReceipt("b64", "image/png");
    expect(Object.keys(r).sort()).toEqual(
      ["amount", "category", "date", "gst", "merchant"].sort(),
    );
  });
});

import { createProvider } from "../index.js";
import { FakeProvider } from "../fake.js";
import { OnDeviceProvider, ON_DEVICE_UNAVAILABLE_MESSAGE } from "../onDevice.js";
import { FakeOcrEngine, MlKitOcrEngine, OCR_UNAVAILABLE_MESSAGE } from "../ocr.js";
import { budgetSchema, insightsSchema } from "../schemas.js";

describe("createProvider factory", () => {
  it("builds an on-device provider (the only kind)", () => {
    const p = createProvider("on-device");
    expect(p.name).toBe("on-device");
    expect(p).toBeInstanceOf(OnDeviceProvider);
  });

  it("records the configured model path", () => {
    const p = new OnDeviceProvider({ modelPath: "/models/gemma.gguf" });
    expect(p.modelPath).toBe("/models/gemma.gguf");
  });
});

describe("OnDeviceProvider", () => {
  // The native lib + a model file are intentionally absent in Node, so every
  // method should throw the clear, documented error rather than crash on a
  // static import or make any network call.
  it("throws the actionable error for chat", async () => {
    const p = new OnDeviceProvider();
    await expect(p.chat([{ role: "user", content: "hi" }], {})).rejects.toThrow(
      ON_DEVICE_UNAVAILABLE_MESSAGE,
    );
  });

  it("throws the actionable error when no model path is configured", async () => {
    const p = new OnDeviceProvider();
    await expect(p.generateInsights({})).rejects.toThrow(/EAS dev build/i);
  });

  it("throws for insights and budget too", async () => {
    const p = new OnDeviceProvider({ modelPath: "/models/x.gguf" });
    await expect(p.generateInsights({})).rejects.toThrow(ON_DEVICE_UNAVAILABLE_MESSAGE);
    await expect(
      p.generateBudget({ monthlyIncome: 1000, savingsGoal: 100 }, []),
    ).rejects.toThrow(ON_DEVICE_UNAVAILABLE_MESSAGE);
  });

  it("exposes no extractReceipt method (OCR lives in the OcrEngine seam)", () => {
    const p = new OnDeviceProvider();
    expect((p as unknown as Record<string, unknown>).extractReceipt).toBeUndefined();
  });
});

describe("OcrEngine", () => {
  it("the ML Kit engine throws the actionable error in Node (no native lib)", async () => {
    const ocr = new MlKitOcrEngine();
    expect(ocr.name).toBe("ml-kit");
    await expect(ocr.recognize("file:///receipt.jpg")).rejects.toThrow(
      OCR_UNAVAILABLE_MESSAGE,
    );
  });

  it("the fake engine returns canned text and records calls", async () => {
    const ocr = new FakeOcrEngine("STORE\nTOTAL 9.99");
    const text = await ocr.recognize("file:///r.jpg");
    expect(text).toContain("TOTAL 9.99");
    expect(ocr.calls).toEqual(["file:///r.jpg"]);
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
});

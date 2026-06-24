import {
  receiptSchema,
  budgetSchema,
  insightsSchema,
  safeParseJson,
  extractJson,
  categorySchema,
} from "../schemas.js";

describe("categorySchema", () => {
  it("accepts a valid category", () => {
    expect(categorySchema.parse("Groceries")).toBe("Groceries");
  });
  it("falls back to Other for an unknown category", () => {
    expect(categorySchema.parse("Crypto NFTs")).toBe("Other");
  });
});

describe("receiptSchema", () => {
  it("parses a clean receipt", () => {
    const r = receiptSchema.parse({
      merchant: "Whole Foods",
      amount: 54.2,
      gst: 4.1,
      date: "2026-03-10",
      category: "Groceries",
    });
    expect(r).toEqual({
      merchant: "Whole Foods",
      amount: 54.2,
      gst: 4.1,
      date: "2026-03-10",
      category: "Groceries",
    });
  });

  it("coerces a money string with currency symbols and commas", () => {
    const r = receiptSchema.parse({
      merchant: "Big Bazaar",
      amount: "$1,234.50",
      date: "2026-03-10",
      category: "Groceries",
    });
    expect(r.amount).toBe(1234.5);
    expect(r.gst).toBe(0); // missing -> default 0
  });

  it("normalizes a full ISO timestamp date to yyyy-mm-dd", () => {
    const r = receiptSchema.parse({
      merchant: "Cafe",
      amount: 5,
      date: "2026-03-10T14:30:00.000Z",
      category: "Dining",
    });
    expect(r.date).toBe("2026-03-10");
  });

  it("nulls an unparseable date", () => {
    const r = receiptSchema.parse({
      merchant: "Cafe",
      amount: 5,
      date: "not a date",
      category: "Dining",
    });
    expect(r.date).toBeNull();
  });

  it("uses safe defaults for missing/garbage fields", () => {
    const r = receiptSchema.parse({
      amount: "abc", // junk -> 0
      date: "2026-03-10",
      category: "Nonsense", // -> Other
    });
    expect(r.merchant).toBe("Unknown");
    expect(r.amount).toBe(0);
    expect(r.category).toBe("Other");
  });
});

describe("budgetSchema", () => {
  it("parses allocations and coerces amounts", () => {
    const b = budgetSchema.parse({
      recommendedSavings: "1000",
      allocations: [
        { category: "Housing", amount: "1500" },
        { category: "Dining", amount: 300 },
      ],
      notes: ["looks good"],
    });
    expect(b.recommendedSavings).toBe(1000);
    expect(b.allocations[0]!.amount).toBe(1500);
    expect(b.allocations).toHaveLength(2);
  });

  it("defaults allocations and notes to empty arrays", () => {
    const b = budgetSchema.parse({ recommendedSavings: 500 });
    expect(b.allocations).toEqual([]);
    expect(b.notes).toEqual([]);
  });
});

describe("insightsSchema", () => {
  it("defaults severity to info for an invalid value", () => {
    const r = insightsSchema.parse({
      insights: [{ title: "Watch dining", detail: "Up 40%", severity: "MEGA" }],
    });
    expect(r.insights[0]!.severity).toBe("info");
  });
});

describe("extractJson", () => {
  it("strips code fences", () => {
    const raw = '```json\n{"merchant":"X","amount":1}\n```';
    expect(extractJson(raw)).toBe('{"merchant":"X","amount":1}');
  });

  it("extracts a JSON object embedded in prose", () => {
    const raw = 'Here is your receipt: {"merchant":"X","amount":1} — enjoy!';
    expect(extractJson(raw)).toBe('{"merchant":"X","amount":1}');
  });

  it("extracts an array", () => {
    const raw = "stuff [1,2,3] more";
    expect(extractJson(raw)).toBe("[1,2,3]");
  });

  it("returns null when there is no JSON", () => {
    expect(extractJson("no json here")).toBeNull();
  });
});

describe("safeParseJson", () => {
  it("parses valid fenced JSON against a schema", () => {
    const raw = '```json\n{"merchant":"Cafe","amount":"12.50","date":"2026-01-01","category":"Dining"}\n```';
    const res = safeParseJson(raw, receiptSchema);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.amount).toBe(12.5);
      expect(res.data.category).toBe("Dining");
    }
  });

  it("fails gracefully on malformed JSON (has braces but is unparseable)", () => {
    // A complete-looking {...} block whose contents are not valid JSON.
    const res = safeParseJson("{ merchant: Cafe, amount: 5 }", receiptSchema);
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/invalid json/i);
  });

  it("reports no-JSON when there is no closing brace to delimit a block", () => {
    const res = safeParseJson("{ not valid json", receiptSchema);
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/no json/i);
  });

  it("fails gracefully when there is no JSON at all", () => {
    const res = safeParseJson("the model refused", receiptSchema);
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toMatch(/no json/i);
  });

  it("recovers a receipt from prose + missing fields", () => {
    const raw = 'Sure! {"amount": 99} is the total.';
    const res = safeParseJson(raw, receiptSchema);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.amount).toBe(99);
      expect(res.data.merchant).toBe("Unknown");
      expect(res.data.category).toBe("Other");
    }
  });
});

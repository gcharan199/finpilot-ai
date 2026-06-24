import { parseReceiptText } from "../receiptParser.js";

/**
 * Real-world-shaped receipt OCR fixtures. Whitespace, line breaks, and noise are
 * representative of what an on-device OCR engine actually emits (ALL CAPS store
 * names, subtotal/total/tax lines, phone numbers, currency symbols, OCR garble).
 */

describe("parseReceiptText — clean receipts", () => {
  it("US grocery receipt: total wins over subtotal, picks merchant + category", () => {
    const text = [
      "WHOLE FOODS MARKET",
      "123 Main St, Austin TX",
      "Tel: (512) 555-0190",
      "",
      "Bananas        2.40",
      "Almond Milk    4.99",
      "Sourdough      5.50",
      "SUBTOTAL      12.89",
      "SALES TAX      1.06",
      "TOTAL         13.95",
      "03/10/2026",
      "VISA ************1234",
    ].join("\n");

    const r = parseReceiptText(text);
    expect(r.merchant).toBe("WHOLE FOODS MARKET");
    expect(r.amount).toBe(13.95);
    expect(r.gst).toBe(1.06);
    expect(r.date).toBe("2026-03-10");
    expect(r.category).toBe("Groceries");
  });

  it("restaurant receipt with $ symbols and a named-month date", () => {
    const text = [
      "Blue Plate Cafe",
      "Order #4821",
      "Pasta            $14.00",
      "Iced Coffee       $4.50",
      "Subtotal         $18.50",
      "Tax               $1.52",
      "Total            $20.02",
      "Mar 10, 2026",
    ].join("\n");

    const r = parseReceiptText(text);
    expect(r.merchant).toBe("Blue Plate Cafe");
    expect(r.amount).toBe(20.02);
    expect(r.gst).toBe(1.52);
    expect(r.date).toBe("2026-03-10");
    expect(r.category).toBe("Dining");
  });

  it("Indian receipt with ₹, GST, day-first date and Rs codes", () => {
    const text = [
      "BIGBASKET",
      "GSTIN: 29ABCDE1234F1Z5",
      "Atta 5kg        Rs 250.00",
      "Milk 1L         Rs 60.00",
      "Sub Total       Rs 310.00",
      "CGST 9%          27.90",
      "SGST 9%          27.90",
      "GRAND TOTAL     ₹365.80",
      "15/03/2026",
    ].join("\n");

    const r = parseReceiptText(text);
    expect(r.merchant).toBe("BIGBASKET");
    expect(r.amount).toBe(365.8);
    // GST line picked up (last GST-ish line); a positive tax amount.
    expect(r.gst).toBeGreaterThan(0);
    expect(r.date).toBe("2026-03-15");
    expect(r.category).toBe("Groceries");
  });

  it("fuel receipt → Transport category, ISO date", () => {
    const text = [
      "SHELL",
      "Pump 4  Unleaded",
      "Litres 38.20",
      "Total    72.40",
      "2026-02-01",
    ].join("\n");

    const r = parseReceiptText(text);
    expect(r.merchant).toBe("SHELL");
    expect(r.amount).toBe(72.4);
    expect(r.gst).toBe(0);
    expect(r.date).toBe("2026-02-01");
    expect(r.category).toBe("Transport");
  });

  it("European decimal format (comma decimal, dot thousands)", () => {
    const text = [
      "IKEA",
      "Billy Bookcase     1.234,50",
      "MwSt                234,50",
      "Gesamt / Total     1.234,50",
      "10.03.2026",
    ].join("\n");

    const r = parseReceiptText(text);
    expect(r.merchant).toBe("IKEA");
    expect(r.amount).toBe(1234.5);
    expect(r.date).toBe("2026-03-10");
    expect(r.category).toBe("Shopping");
  });
});

describe("parseReceiptText — messy / noisy OCR", () => {
  it("falls back to the largest value when there is no explicit total line", () => {
    const text = [
      "STARBUCKS",
      "Latte 5.25",
      "Croissant 3.75",
      "9.00",
      "01/15/2026",
    ].join("\n");

    const r = parseReceiptText(text);
    expect(r.merchant).toBe("STARBUCKS");
    expect(r.amount).toBe(9.0); // largest value
    expect(r.date).toBe("2026-01-15");
    expect(r.category).toBe("Dining");
  });

  it("handles OCR noise lines, leading blank lines and stray symbols", () => {
    const text = [
      "   ",
      "###",
      "TARGET",
      "store #1422 |||",
      "item ~~~ 19.99",
      "TOTAL  $24.07",
      "tax 1.99",
      "Feb 28, 2026",
      "thank y0u f0r sh0pping",
    ].join("\n");

    const r = parseReceiptText(text);
    expect(r.merchant).toBe("TARGET");
    expect(r.amount).toBe(24.07);
    expect(r.gst).toBe(1.99);
    expect(r.date).toBe("2026-02-28");
    expect(r.category).toBe("Shopping");
  });

  it("ignores a GST percentage rate and reads the tax amount", () => {
    const text = [
      "Pharmacy Plus",
      "Subtotal 100.00",
      "GST 18% 18.00",
      "Total 118.00",
      "2026-04-05",
    ].join("\n");

    const r = parseReceiptText(text);
    expect(r.amount).toBe(118.0);
    expect(r.gst).toBe(18.0);
    expect(r.category).toBe("Health");
  });

  it("returns null date and Unknown merchant when nothing is parseable", () => {
    const text = ["8888", "@@@@", "TOTAL 50.00"].join("\n");
    const r = parseReceiptText(text);
    expect(r.merchant).toBe("Unknown");
    expect(r.amount).toBe(50.0);
    expect(r.date).toBeNull();
    expect(r.category).toBe("Other");
  });

  it("handles empty / whitespace-only input gracefully", () => {
    const r = parseReceiptText("   \n\n   ");
    expect(r).toEqual({
      merchant: "Unknown",
      amount: 0,
      gst: 0,
      date: null,
      category: "Other",
    });
  });

  it("uses the LAST total line when subtotal and total both appear", () => {
    const text = [
      "Costco Wholesale",
      "SUBTOTAL 210.00",
      "TAX 17.33",
      "TOTAL 227.33",
      "2026-05-20",
    ].join("\n");
    const r = parseReceiptText(text);
    expect(r.amount).toBe(227.33);
    expect(r.gst).toBe(17.33);
    expect(r.category).toBe("Groceries");
  });

  it("parses a 2-digit-year slash date (day-first when first field > 12)", () => {
    const text = ["Netflix", "Subscription", "TOTAL 15.49", "28/02/26"].join("\n");
    const r = parseReceiptText(text);
    expect(r.amount).toBe(15.49);
    expect(r.date).toBe("2026-02-28");
    expect(r.category).toBe("Subscriptions");
  });
});

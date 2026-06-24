/**
 * Pure-TypeScript receipt parser
 * ==============================
 *
 * Turns the raw text produced by **on-device OCR** into structured receipt
 * fields — `{ merchant, amount, gst, date, category }` — with deterministic
 * heuristics and regular expressions. No IO, no network, no React Native deps,
 * no LLM required. This is the open-source core of the 100%-local receipt path:
 *
 *     camera/image → on-device OCR text → parseReceiptText() → save
 *
 * An on-device LLM may *optionally* refine ambiguous output, but this parser
 * stands alone and is unit-tested against real-world receipt-text fixtures
 * (clean and messy).
 *
 * Heuristics
 * ----------
 *  - **amount**: the value on a "total"/"amount due"/"grand total" line if one
 *    exists (the last such line wins — receipts often print subtotal → total),
 *    otherwise the largest currency-looking number anywhere in the text.
 *  - **gst**: the value on a tax / GST / VAT / sales-tax line, else 0.
 *  - **date**: the first parseable date in any common format, normalized to
 *    `yyyy-mm-dd`; `null` when none is found.
 *  - **merchant**: the first "meaningful" line (skipping blank lines and lines
 *    that are mostly digits/symbols like phone numbers or addresses).
 *  - **category**: derived from the merchant via the existing {@link categorize}.
 */

import { categorize } from "./categorize.js";
import type { Category } from "./types.js";

/** Structured result mirroring `@finpilot/ai-engine`'s `Receipt` shape. */
export interface ParsedReceipt {
  merchant: string;
  amount: number;
  gst: number;
  /** yyyy-mm-dd, or null when no date could be parsed. */
  date: string | null;
  category: Category;
}

export interface ParseReceiptOptions {
  /** A reference "today" used when a year is missing; defaults to `new Date()`. */
  now?: Date;
}

/** Keywords that mark the grand-total line, most-specific first. */
const TOTAL_KEYWORDS = [
  "grand total",
  "total due",
  "amount due",
  "balance due",
  "total amount",
  "total paid",
  "total",
];

/** Keywords that mark a tax/GST line. */
const TAX_KEYWORDS = ["gst", "vat", "sales tax", "tax", "cgst", "sgst", "igst"];

/** Lines we should never treat as the merchant name. */
const NON_MERCHANT_HINTS = [
  "receipt",
  "invoice",
  "tax invoice",
  "gstin",
  "vat no",
  "tel",
  "phone",
  "www.",
  "http",
];

/**
 * Pull every currency-looking number out of a string. Handles `$`, `₹`, `€`,
 * `£`, `rs`, thousands separators, and trailing/leading symbols. Returns plain
 * numbers (major units).
 */
function currencyValues(line: string): number[] {
  // Remove any date tokens first so a year like "2026" in "01/15/2026" is never
  // mistaken for a currency amount.
  const cleaned = stripDateTokens(line);
  const out: number[] = [];
  // Match runs like 1,234.50 / 1.234,50 / 1234.5 / 99 optionally prefixed by a
  // currency symbol or code.
  const re = /(?:[$₹€£]|rs\.?|inr|usd|eur|gbp)?\s*([\d][\d.,\s]*\d|\d)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line === cleaned ? line : cleaned)) !== null) {
    const n = parseMoney(m[1] ?? "");
    if (n !== null) out.push(n);
  }
  return out;
}

/** Blank out date-shaped substrings so their digits aren't read as money. */
function stripDateTokens(line: string): string {
  return line
    .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g, " ")
    .replace(/\b\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}\b/g, " ")
    .replace(/\b\d{1,2}[ ]+[A-Za-z]{3,9}\.?,?[ ]+\d{2,4}\b/g, " ")
    .replace(/\b[A-Za-z]{3,9}\.?[ ]+\d{1,2},?[ ]+\d{2,4}\b/g, " ");
}

/** Parse a single money token like "1,234.50" or "1.234,50" → number. */
function parseMoney(token: string): number | null {
  let t = token.replace(/\s/g, "");
  if (t.length === 0) return null;
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  // Decide the decimal separator: whichever appears last and leaves <=2 digits.
  if (lastComma > lastDot) {
    // European style "1.234,50" → comma is decimal.
    t = t.replace(/\./g, "").replace(",", ".");
  } else {
    // US style "1,234.50" → comma is a thousands separator.
    t = t.replace(/,/g, "");
  }
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** The largest currency value found anywhere in the text. */
function largestValue(lines: string[]): number {
  let max = 0;
  for (const line of lines) {
    for (const v of currencyValues(line)) {
      if (v > max) max = v;
    }
  }
  return max;
}

/** Find the amount on a total line (last match wins), else the largest value. */
function findAmount(lines: string[]): number {
  let amount: number | null = null;
  for (const raw of lines) {
    const lower = raw.toLowerCase();
    // Skip subtotal lines so they don't shadow the real total.
    if (lower.includes("subtotal") || lower.includes("sub total")) continue;
    if (TOTAL_KEYWORDS.some((k) => lower.includes(k))) {
      const vals = currencyValues(raw);
      if (vals.length) amount = vals[vals.length - 1]!; // value after the label
    }
  }
  if (amount !== null && amount > 0) return amount;
  return largestValue(lines);
}

/** Find the tax/GST amount on a tax line, else 0. */
function findGst(lines: string[]): number {
  for (const raw of lines) {
    const lower = raw.toLowerCase();
    if (TAX_KEYWORDS.some((k) => new RegExp(`\\b${k}\\b`).test(lower))) {
      const vals = currencyValues(raw);
      // Ignore percentages like "GST 18%": a bare integer immediately before a
      // % sign is a rate, not an amount.
      if (vals.length) {
        const last = vals[vals.length - 1]!;
        if (!/\b\d+(\.\d+)?\s*%/.test(raw)) return last;
        // If there are two numbers ("18% 4.10") prefer the non-percentage one.
        if (vals.length >= 2) return vals[vals.length - 1]!;
      }
    }
  }
  return 0;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Normalize a 2- or 4-digit year to 4 digits. */
function normYear(y: number): number {
  if (y >= 100) return y;
  return y >= 70 ? 1900 + y : 2000 + y;
}

function validYmd(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Find the first parseable date and return it as yyyy-mm-dd. Supports:
 *   2026-03-10 · 10/03/2026 · 03/10/26 · 10-03-2026 · 10 Mar 2026 · Mar 10, 2026.
 * For ambiguous numeric d/m order, day-first is assumed when the first field
 * is > 12 (otherwise month-first, matching US receipts).
 */
function findDate(lines: string[]): string | null {
  // Scan line-by-line so `\s` in the named-month patterns can never span a
  // newline and stitch unrelated numbers into a bogus date.
  for (const line of lines) {
    const d = parseDateFromLine(line);
    if (d) return d;
  }
  return null;
}

/** Try every supported date shape on a single line. */
function parseDateFromLine(line: string): string | null {
  // ISO: yyyy-mm-dd
  const iso = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(line);
  if (iso) {
    const r = validYmd(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (r) return r;
  }

  // "10 Mar 2026" / "10 March 2026" (spaces only, not newlines)
  const dmy = /\b(\d{1,2})[ ]+([A-Za-z]{3,9})\.?,?[ ]+(\d{2,4})\b/.exec(line);
  if (dmy) {
    const mon = MONTHS[dmy[2]!.slice(0, 3).toLowerCase()];
    if (mon) {
      const r = validYmd(normYear(Number(dmy[3])), mon, Number(dmy[1]));
      if (r) return r;
    }
  }

  // "Mar 10, 2026" / "March 10 2026"
  const mdy = /\b([A-Za-z]{3,9})\.?[ ]+(\d{1,2}),?[ ]+(\d{2,4})\b/.exec(line);
  if (mdy) {
    const mon = MONTHS[mdy[1]!.slice(0, 3).toLowerCase()];
    if (mon) {
      const r = validYmd(normYear(Number(mdy[3])), mon, Number(mdy[2]));
      if (r) return r;
    }
  }

  // Numeric with / - or . separators: a.b.c, a/b/c, a-b-c
  const num = /\b(\d{1,4})([/.-])(\d{1,2})[/.-](\d{2,4})\b/.exec(line);
  if (num) {
    const a = Number(num[1]);
    const sep = num[2];
    const b = Number(num[3]);
    const c = Number(num[4]);
    if (num[1]!.length === 4) {
      // yyyy/mm/dd
      const r = validYmd(a, b, c);
      if (r) return r;
    } else {
      // a<sep>b<sep>c where c is the year. Decide day/month order:
      //  - a > 12  → unambiguously day-first.
      //  - dot-separated (dd.mm.yyyy) → European day-first convention.
      //  - otherwise (slash/dash) → month-first (US convention).
      const year = normYear(c);
      const dayFirst = a > 12 || sep === ".";
      const r = dayFirst ? validYmd(year, b, a) : validYmd(year, a, b);
      if (r) return r;
    }
  }

  return null;
}

/** Pick the merchant: the first meaningful line near the top. */
function findMerchant(lines: string[]): string {
  for (const raw of lines.slice(0, 6)) {
    const line = raw.trim();
    if (line.length < 2) continue;
    const lower = line.toLowerCase();
    if (NON_MERCHANT_HINTS.some((h) => lower.includes(h))) continue;
    // Never treat a total/subtotal/tax line as the merchant name.
    if (
      lower.includes("subtotal") ||
      lower.includes("sub total") ||
      TOTAL_KEYWORDS.some((k) => lower.includes(k)) ||
      TAX_KEYWORDS.some((k) => new RegExp(`\\b${k}\\b`).test(lower))
    ) {
      continue;
    }
    // Skip lines that are mostly digits/symbols (phone numbers, totals, dates).
    const letters = (line.match(/[A-Za-z]/g) ?? []).length;
    const nonSpace = line.replace(/\s/g, "").length;
    if (nonSpace === 0 || letters / nonSpace < 0.5) continue;
    // Looks like a name.
    return line.replace(/\s+/g, " ");
  }
  return "Unknown";
}

/**
 * Parse raw OCR receipt text into structured fields. Pure and deterministic.
 *
 * @param raw the newline-delimited text from an on-device OCR engine.
 * @returns merchant, amount, gst, date (yyyy-mm-dd|null), and category.
 */
export function parseReceiptText(
  raw: string,
  _options: ParseReceiptOptions = {},
): ParsedReceipt {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { merchant: "Unknown", amount: 0, gst: 0, date: null, category: "Other" };
  }

  const merchant = findMerchant(lines);
  const amount = Math.max(0, findAmount(lines));
  const gst = Math.max(0, findGst(lines));
  const date = findDate(lines);
  const category = categorize({ merchant, description: raw });

  return { merchant, amount, gst, date, category };
}

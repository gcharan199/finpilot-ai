/**
 * Heuristic transaction categorizer
 * ==================================
 *
 * Maps a merchant/description string to a {@link Category} using an extensible
 * keyword map. Deterministic and pure. The map is exported so the app can add
 * locale-specific merchants without forking the engine.
 *
 * Matching rules:
 *   - case-insensitive substring match on the combined merchant + description
 *   - the most *specific* (longest keyword) match wins, so "whole foods market"
 *     beats a generic "market" entry
 *   - no match -> "Other"
 */

import type { Category } from "./types.js";

/**
 * Default keyword -> category rules. Keys are lower-cased substrings.
 * Extend by spreading this into your own map, or pass a custom map to
 * {@link categorize}.
 */
export const DEFAULT_CATEGORY_RULES: Readonly<Record<string, Category>> = {
  // Income
  salary: "Income",
  payroll: "Income",
  paycheck: "Income",
  deposit: "Income",
  refund: "Income",
  interest: "Income",

  // Housing
  rent: "Housing",
  mortgage: "Housing",
  landlord: "Housing",
  "property management": "Housing",

  // Utilities
  electric: "Utilities",
  electricity: "Utilities",
  water: "Utilities",
  "gas bill": "Utilities",
  internet: "Utilities",
  broadband: "Utilities",
  comcast: "Utilities",
  verizon: "Utilities",
  "at&t": "Utilities",
  vodafone: "Utilities",
  jio: "Utilities",

  // Groceries
  grocery: "Groceries",
  groceries: "Groceries",
  supermarket: "Groceries",
  "whole foods": "Groceries",
  walmart: "Groceries",
  costco: "Groceries",
  aldi: "Groceries",
  kroger: "Groceries",
  "trader joe": "Groceries",
  bigbasket: "Groceries",
  dmart: "Groceries",

  // Dining
  restaurant: "Dining",
  cafe: "Dining",
  coffee: "Dining",
  starbucks: "Dining",
  mcdonald: "Dining",
  "burger king": "Dining",
  pizza: "Dining",
  doordash: "Dining",
  ubereats: "Dining",
  "uber eats": "Dining",
  swiggy: "Dining",
  zomato: "Dining",
  grubhub: "Dining",

  // Transport
  uber: "Transport",
  lyft: "Transport",
  ola: "Transport",
  taxi: "Transport",
  fuel: "Transport",
  gasoline: "Transport",
  shell: "Transport",
  chevron: "Transport",
  parking: "Transport",
  transit: "Transport",
  metro: "Transport",
  "train ticket": "Transport",

  // Shopping
  amazon: "Shopping",
  ebay: "Shopping",
  target: "Shopping",
  "best buy": "Shopping",
  ikea: "Shopping",
  flipkart: "Shopping",
  myntra: "Shopping",
  zara: "Shopping",
  "h&m": "Shopping",

  // Health
  pharmacy: "Health",
  cvs: "Health",
  walgreens: "Health",
  doctor: "Health",
  clinic: "Health",
  hospital: "Health",
  dental: "Health",
  "health insurance": "Health",
  gym: "Health",

  // Entertainment
  cinema: "Entertainment",
  movie: "Entertainment",
  amc: "Entertainment",
  "playstation": "Entertainment",
  xbox: "Entertainment",
  steam: "Entertainment",
  concert: "Entertainment",

  // Travel
  airline: "Travel",
  airlines: "Travel",
  flight: "Travel",
  hotel: "Travel",
  airbnb: "Travel",
  expedia: "Travel",
  booking: "Travel",
  makemytrip: "Travel",

  // Education
  tuition: "Education",
  udemy: "Education",
  coursera: "Education",
  university: "Education",
  textbook: "Education",

  // Subscriptions
  netflix: "Subscriptions",
  spotify: "Subscriptions",
  "youtube premium": "Subscriptions",
  "prime video": "Subscriptions",
  "disney+": "Subscriptions",
  "apple music": "Subscriptions",
  icloud: "Subscriptions",
  dropbox: "Subscriptions",
  notion: "Subscriptions",
  subscription: "Subscriptions",

  // Debt
  "loan payment": "Debt",
  "credit card payment": "Debt",
  emi: "Debt",
  "student loan": "Debt",

  // Fees
  "bank fee": "Fees",
  "atm fee": "Fees",
  "late fee": "Fees",
  "service charge": "Fees",
  overdraft: "Fees",
};

export interface CategorizeOptions {
  /** Override / extend the default rules. Merged over the defaults. */
  rules?: Record<string, Category>;
  /** Fallback when nothing matches. Defaults to "Other". */
  fallback?: Category;
}

/**
 * Categorize a transaction by its merchant and/or description.
 *
 * @param input merchant and/or free-text description.
 * @param options optional custom rules and fallback.
 * @returns the matched {@link Category} (longest-keyword match wins).
 */
export function categorize(
  input: { merchant?: string; description?: string },
  options: CategorizeOptions = {},
): Category {
  const fallback = options.fallback ?? "Other";
  const rules = options.rules
    ? { ...DEFAULT_CATEGORY_RULES, ...options.rules }
    : DEFAULT_CATEGORY_RULES;

  const haystack = `${input.merchant ?? ""} ${input.description ?? ""}`
    .toLowerCase()
    .trim();
  if (haystack.length === 0) return fallback;

  let best: { category: Category; length: number } | null = null;
  for (const [keyword, category] of Object.entries(rules)) {
    if (haystack.includes(keyword)) {
      if (best === null || keyword.length > best.length) {
        best = { category, length: keyword.length };
      }
    }
  }

  return best?.category ?? fallback;
}

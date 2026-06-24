/**
 * Drizzle SQLite schema for FinPilot AI.
 *
 * Plain SQLite (`sqlite-core`) so the same schema runs on `better-sqlite3` in
 * Node tests and `expo-sqlite` on-device. Money is stored as REAL in major
 * currency units. Dates are ISO-8601 TEXT (sortable, timezone-explicit).
 */

import { sql, relations } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Bank / cash / card accounts the user tracks. */
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** e.g. "checking" | "savings" | "credit" | "cash" — free text, app-validated. */
  type: text("type").notNull().default("checking"),
  currency: text("currency").notNull().default("USD"),
  /** Current balance in major units. */
  balance: real("balance").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/** Spend/earn categories. Seeded from the finance-engine category list. */
export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    /** Matches @finpilot/finance-engine `Category` values. */
    name: text("name").notNull(),
    /** Optional emoji/icon name for the UI. */
    icon: text("icon"),
    /** Whether this category counts as essential ("need") for budgeting. */
    isEssential: integer("is_essential", { mode: "boolean" }).notNull().default(false),
  },
  (t) => ({
    nameIdx: index("categories_name_idx").on(t.name),
  }),
);

/** Individual income/expense transactions. */
export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    /** Always positive; `type` carries the sign. Major currency units. */
    amount: real("amount").notNull(),
    /** "income" | "expense". */
    type: text("type", { enum: ["income", "expense"] }).notNull(),
    merchant: text("merchant"),
    note: text("note"),
    /** ISO-8601 date (yyyy-mm-dd or full). */
    date: text("date").notNull(),
    /** Where the row came from: "manual" | "receipt" (AI extraction). */
    source: text("source", { enum: ["manual", "receipt"] })
      .notNull()
      .default("manual"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => ({
    // Hot paths: per-account history and per-category spend-by-month aggregates.
    accountDateIdx: index("transactions_account_date_idx").on(t.accountId, t.date),
    categoryDateIdx: index("transactions_category_date_idx").on(t.categoryId, t.date),
    dateIdx: index("transactions_date_idx").on(t.date),
  }),
);

/** Per-category monthly budget targets. */
export const budgets = sqliteTable(
  "budgets",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    /** Budget month as "yyyy-mm". */
    month: text("month").notNull(),
    /** Target spend for the category that month, major units. */
    amount: real("amount").notNull(),
  },
  (t) => ({
    monthIdx: index("budgets_month_idx").on(t.month),
    categoryMonthIdx: index("budgets_category_month_idx").on(t.categoryId, t.month),
  }),
);

/** Relations (for drizzle's relational query API). */
export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

/** Full schema object — pass to `drizzle(sqlite, { schema })`. */
export const schema = {
  accounts,
  categories,
  transactions,
  budgets,
  accountsRelations,
  categoriesRelations,
  transactionsRelations,
  budgetsRelations,
};

/** Row types inferred from the schema (for repository signatures). */
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type CategoryRow = typeof categories.$inferSelect;
export type NewCategoryRow = typeof categories.$inferInsert;
export type TransactionRow = typeof transactions.$inferSelect;
export type NewTransactionRow = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;

/**
 * Repositories — dependency-injected data access.
 *
 * Every function takes a {@link FinPilotDb} (drizzle instance) as its first
 * argument, so the same code runs against `better-sqlite3` in Node tests and
 * `expo-sqlite` on device. All functions are async; awaiting a synchronous
 * better-sqlite3 result is a harmless no-op, so this works for both drivers.
 */

import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { FinPilotDb } from "./client.js";
import {
  accounts,
  budgets,
  categories,
  transactions,
  type Account,
  type Budget,
  type CategoryRow,
  type NewAccount,
  type NewBudget,
  type NewCategoryRow,
  type NewTransactionRow,
  type TransactionRow,
} from "./schema.js";

/* -------------------------------------------------------------------------- */
/* Accounts                                                                   */
/* -------------------------------------------------------------------------- */

export const accountsRepo = {
  async create(db: FinPilotDb, data: NewAccount): Promise<Account> {
    const [row] = await db.insert(accounts).values(data).returning();
    return row!;
  },

  async list(db: FinPilotDb): Promise<Account[]> {
    return db.select().from(accounts).orderBy(accounts.name);
  },

  async getById(db: FinPilotDb, id: string): Promise<Account | undefined> {
    const [row] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    return row;
  },

  async updateBalance(db: FinPilotDb, id: string, balance: number): Promise<void> {
    await db.update(accounts).set({ balance }).where(eq(accounts.id, id));
  },

  async remove(db: FinPilotDb, id: string): Promise<void> {
    await db.delete(accounts).where(eq(accounts.id, id));
  },
};

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

export const categoriesRepo = {
  async create(db: FinPilotDb, data: NewCategoryRow): Promise<CategoryRow> {
    const [row] = await db.insert(categories).values(data).returning();
    return row!;
  },

  /** Bulk-insert (e.g. seeding the finance-engine category list). */
  async createMany(db: FinPilotDb, rows: NewCategoryRow[]): Promise<void> {
    if (rows.length === 0) return;
    await db.insert(categories).values(rows);
  },

  async list(db: FinPilotDb): Promise<CategoryRow[]> {
    return db.select().from(categories).orderBy(categories.name);
  },

  async getByName(db: FinPilotDb, name: string): Promise<CategoryRow | undefined> {
    const [row] = await db
      .select()
      .from(categories)
      .where(eq(categories.name, name))
      .limit(1);
    return row;
  },
};

/* -------------------------------------------------------------------------- */
/* Transactions                                                               */
/* -------------------------------------------------------------------------- */

export interface TransactionFilter {
  accountId?: string;
  categoryId?: string;
  /** Inclusive ISO date lower bound. */
  from?: string;
  /** Exclusive ISO date upper bound. */
  to?: string;
  limit?: number;
}

export const transactionsRepo = {
  async create(db: FinPilotDb, data: NewTransactionRow): Promise<TransactionRow> {
    const [row] = await db.insert(transactions).values(data).returning();
    return row!;
  },

  async createMany(db: FinPilotDb, rows: NewTransactionRow[]): Promise<void> {
    if (rows.length === 0) return;
    await db.insert(transactions).values(rows);
  },

  /** List transactions, newest first, with optional filters. */
  async list(db: FinPilotDb, filter: TransactionFilter = {}): Promise<TransactionRow[]> {
    const conds = [];
    if (filter.accountId) conds.push(eq(transactions.accountId, filter.accountId));
    if (filter.categoryId) conds.push(eq(transactions.categoryId, filter.categoryId));
    if (filter.from) conds.push(gte(transactions.date, filter.from));
    if (filter.to) conds.push(lt(transactions.date, filter.to));

    const base = db
      .select()
      .from(transactions)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(transactions.date));

    return filter.limit ? base.limit(filter.limit) : base;
  },

  async getById(db: FinPilotDb, id: string): Promise<TransactionRow | undefined> {
    const [row] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);
    return row;
  },

  async remove(db: FinPilotDb, id: string): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  },
};

/* -------------------------------------------------------------------------- */
/* Aggregates                                                                 */
/* -------------------------------------------------------------------------- */

export interface CategorySpend {
  categoryId: string | null;
  total: number;
  count: number;
}

export interface MonthTotals {
  income: number;
  expense: number;
  net: number;
}

/**
 * Convert a "yyyy-mm" month string to its inclusive start and exclusive end
 * ISO date bounds, e.g. "2026-03" -> { start: "2026-03-01", end: "2026-04-01" }.
 */
export function monthBounds(month: string): { start: string; end: string } {
  const [yStr, mStr] = month.split("-");
  const year = Number(yStr);
  const m = Number(mStr);
  if (!Number.isInteger(year) || !Number.isInteger(m) || m < 1 || m > 12) {
    throw new Error(`Invalid month "${month}"; expected "yyyy-mm".`);
  }
  const start = `${month}-01`;
  const nextYear = m === 12 ? year + 1 : year;
  const nextMonth = m === 12 ? 1 : m + 1;
  const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { start, end };
}

export const aggregatesRepo = {
  /**
   * Sum *expense* spend grouped by category for a given "yyyy-mm" month.
   * Returns one row per category that had expense activity that month.
   */
  async spendByCategoryForMonth(
    db: FinPilotDb,
    month: string,
    accountId?: string,
  ): Promise<CategorySpend[]> {
    const { start, end } = monthBounds(month);
    const conds = [
      eq(transactions.type, "expense"),
      gte(transactions.date, start),
      lt(transactions.date, end),
    ];
    if (accountId) conds.push(eq(transactions.accountId, accountId));

    const rows = await db
      .select({
        categoryId: transactions.categoryId,
        total: sql<number>`sum(${transactions.amount})`,
        count: sql<number>`count(*)`,
      })
      .from(transactions)
      .where(and(...conds))
      .groupBy(transactions.categoryId);

    // sql() aggregates may come back as strings from some drivers; coerce.
    return rows.map((r) => ({
      categoryId: r.categoryId,
      total: Number(r.total ?? 0),
      count: Number(r.count ?? 0),
    }));
  },

  /** Income / expense / net totals for a "yyyy-mm" month. */
  async monthTotals(
    db: FinPilotDb,
    month: string,
    accountId?: string,
  ): Promise<MonthTotals> {
    const { start, end } = monthBounds(month);
    const conds = [gte(transactions.date, start), lt(transactions.date, end)];
    if (accountId) conds.push(eq(transactions.accountId, accountId));

    const rows = await db
      .select({
        type: transactions.type,
        total: sql<number>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(and(...conds))
      .groupBy(transactions.type);

    let income = 0;
    let expense = 0;
    for (const r of rows) {
      if (r.type === "income") income = Number(r.total ?? 0);
      else if (r.type === "expense") expense = Number(r.total ?? 0);
    }
    return { income, expense, net: income - expense };
  },
};

/* -------------------------------------------------------------------------- */
/* Budgets                                                                    */
/* -------------------------------------------------------------------------- */

export const budgetsRepo = {
  async upsert(db: FinPilotDb, data: NewBudget): Promise<Budget> {
    const [row] = await db
      .insert(budgets)
      .values(data)
      .onConflictDoUpdate({
        target: budgets.id,
        set: { amount: data.amount, month: data.month, categoryId: data.categoryId },
      })
      .returning();
    return row!;
  },

  async listForMonth(db: FinPilotDb, month: string): Promise<Budget[]> {
    return db.select().from(budgets).where(eq(budgets.month, month));
  },
};

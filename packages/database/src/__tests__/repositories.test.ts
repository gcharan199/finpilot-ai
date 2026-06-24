/**
 * Real, runnable DB tests in Node.
 *
 * Spins up an in-memory `better-sqlite3` database, applies the generated drizzle
 * migrations, then exercises the repositories end-to-end (inserts + aggregates).
 */

import { resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { schema } from "../schema.js";
import type { FinPilotDb } from "../client.js";
import {
  accountsRepo,
  aggregatesRepo,
  budgetsRepo,
  categoriesRepo,
  monthBounds,
  transactionsRepo,
} from "../repositories.js";

// migrations/ lives at the package root (../../migrations from src/__tests__).
// `__dirname` is provided by the (ts-jest) module wrapper at runtime.
const MIGRATIONS_DIR = resolve(__dirname, "../../migrations");

function freshDb(): { db: FinPilotDb; close: () => void } {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return { db: db as unknown as FinPilotDb, close: () => sqlite.close() };
}

describe("database repositories (better-sqlite3 in-memory)", () => {
  let db: FinPilotDb;
  let close: () => void;

  beforeEach(() => {
    ({ db, close } = freshDb());
  });

  afterEach(() => close());

  async function seedAccountAndCategories() {
    const acct = await accountsRepo.create(db, {
      id: "acc1",
      name: "Checking",
      type: "checking",
      currency: "USD",
      balance: 1000,
    });
    await categoriesRepo.createMany(db, [
      { id: "cat-groceries", name: "Groceries", isEssential: true },
      { id: "cat-dining", name: "Dining", isEssential: false },
      { id: "cat-income", name: "Income", isEssential: false },
    ]);
    return acct;
  }

  it("applies migrations and creates an account", async () => {
    const acct = await accountsRepo.create(db, {
      id: "acc1",
      name: "Main",
      type: "checking",
      balance: 500,
    });
    expect(acct.id).toBe("acc1");
    const fetched = await accountsRepo.getById(db, "acc1");
    expect(fetched?.name).toBe("Main");
    expect(fetched?.balance).toBe(500);
  });

  it("inserts and lists transactions newest-first", async () => {
    await seedAccountAndCategories();
    await transactionsRepo.createMany(db, [
      { id: "t1", accountId: "acc1", categoryId: "cat-groceries", amount: 50, type: "expense", date: "2026-03-01" },
      { id: "t2", accountId: "acc1", categoryId: "cat-dining", amount: 30, type: "expense", date: "2026-03-15" },
      { id: "t3", accountId: "acc1", categoryId: "cat-income", amount: 4000, type: "income", date: "2026-03-02" },
    ]);

    const all = await transactionsRepo.list(db, { accountId: "acc1" });
    expect(all).toHaveLength(3);
    // newest date first
    expect(all[0]!.id).toBe("t2");
  });

  it("filters transactions by date range and category", async () => {
    await seedAccountAndCategories();
    await transactionsRepo.createMany(db, [
      { id: "t1", accountId: "acc1", categoryId: "cat-groceries", amount: 50, type: "expense", date: "2026-02-20" },
      { id: "t2", accountId: "acc1", categoryId: "cat-groceries", amount: 60, type: "expense", date: "2026-03-05" },
      { id: "t3", accountId: "acc1", categoryId: "cat-dining", amount: 25, type: "expense", date: "2026-03-06" },
    ]);

    const marchGroceries = await transactionsRepo.list(db, {
      categoryId: "cat-groceries",
      from: "2026-03-01",
      to: "2026-04-01",
    });
    expect(marchGroceries).toHaveLength(1);
    expect(marchGroceries[0]!.id).toBe("t2");
  });

  it("aggregates spend-by-category for a month (expenses only)", async () => {
    await seedAccountAndCategories();
    await transactionsRepo.createMany(db, [
      { id: "t1", accountId: "acc1", categoryId: "cat-groceries", amount: 100, type: "expense", date: "2026-03-01" },
      { id: "t2", accountId: "acc1", categoryId: "cat-groceries", amount: 50, type: "expense", date: "2026-03-10" },
      { id: "t3", accountId: "acc1", categoryId: "cat-dining", amount: 40, type: "expense", date: "2026-03-12" },
      // income must be excluded from spend aggregates
      { id: "t4", accountId: "acc1", categoryId: "cat-income", amount: 4000, type: "income", date: "2026-03-02" },
      // a transaction in another month must be excluded
      { id: "t5", accountId: "acc1", categoryId: "cat-groceries", amount: 999, type: "expense", date: "2026-04-01" },
    ]);

    const spend = await aggregatesRepo.spendByCategoryForMonth(db, "2026-03");
    const byCat = Object.fromEntries(spend.map((s) => [s.categoryId, s]));
    expect(byCat["cat-groceries"]!.total).toBe(150);
    expect(byCat["cat-groceries"]!.count).toBe(2);
    expect(byCat["cat-dining"]!.total).toBe(40);
    expect(byCat["cat-income"]).toBeUndefined(); // income excluded
  });

  it("computes month totals (income / expense / net)", async () => {
    await seedAccountAndCategories();
    await transactionsRepo.createMany(db, [
      { id: "t1", accountId: "acc1", categoryId: "cat-income", amount: 5000, type: "income", date: "2026-03-01" },
      { id: "t2", accountId: "acc1", categoryId: "cat-groceries", amount: 200, type: "expense", date: "2026-03-03" },
      { id: "t3", accountId: "acc1", categoryId: "cat-dining", amount: 300, type: "expense", date: "2026-03-04" },
    ]);

    const totals = await aggregatesRepo.monthTotals(db, "2026-03");
    expect(totals.income).toBe(5000);
    expect(totals.expense).toBe(500);
    expect(totals.net).toBe(4500);
  });

  it("upserts a budget and lists it for the month", async () => {
    await seedAccountAndCategories();
    await budgetsRepo.upsert(db, {
      id: "b1",
      categoryId: "cat-groceries",
      month: "2026-03",
      amount: 400,
    });
    // upsert again with a new amount
    await budgetsRepo.upsert(db, {
      id: "b1",
      categoryId: "cat-groceries",
      month: "2026-03",
      amount: 450,
    });

    const list = await budgetsRepo.listForMonth(db, "2026-03");
    expect(list).toHaveLength(1);
    expect(list[0]!.amount).toBe(450);
  });

  it("cascades transaction deletion when an account is removed", async () => {
    await seedAccountAndCategories();
    await transactionsRepo.create(db, {
      id: "t1",
      accountId: "acc1",
      categoryId: "cat-groceries",
      amount: 10,
      type: "expense",
      date: "2026-03-01",
    });
    await accountsRepo.remove(db, "acc1");
    const remaining = await transactionsRepo.list(db, {});
    expect(remaining).toHaveLength(0);
  });
});

describe("monthBounds", () => {
  it("computes inclusive start / exclusive end", () => {
    expect(monthBounds("2026-03")).toEqual({ start: "2026-03-01", end: "2026-04-01" });
  });
  it("rolls over December to the next year", () => {
    expect(monthBounds("2026-12")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
  it("throws on a malformed month", () => {
    expect(() => monthBounds("2026-13")).toThrow();
    expect(() => monthBounds("nope")).toThrow();
  });
});

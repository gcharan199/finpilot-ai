/**
 * @finpilot/database
 *
 * Drizzle SQLite schema + dependency-injected repositories. Driver-agnostic:
 * pass a `better-sqlite3` drizzle instance (Node/tests) or an `expo-sqlite` one
 * (device) — the repositories don't care.
 */

export * from "./schema.js";
export { createDb, type FinPilotDb, type BetterSqlite3Like } from "./client.js";
export {
  accountsRepo,
  categoriesRepo,
  transactionsRepo,
  aggregatesRepo,
  budgetsRepo,
  monthBounds,
  type TransactionFilter,
  type CategorySpend,
  type MonthTotals,
} from "./repositories.js";

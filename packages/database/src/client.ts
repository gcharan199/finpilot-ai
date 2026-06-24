/**
 * DB client factory.
 *
 * The repositories are written against drizzle's generic `BaseSQLiteDatabase`
 * type, so they don't care whether the underlying driver is `better-sqlite3`
 * (Node / tests) or `expo-sqlite` (device). This module provides a typed alias
 * plus a Node-side factory used by tests.
 *
 * The Expo app builds its own drizzle instance with the `drizzle-orm/expo-sqlite`
 * driver and passes it to the same repositories — the schema is identical.
 */

import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { schema } from "./schema.js";

/**
 * The drizzle DB type the repositories accept. Generic over driver result type,
 * so any SQLite driver's drizzle instance is assignable.
 */
export type FinPilotDb = BaseSQLiteDatabase<"sync" | "async", unknown, typeof schema>;

/**
 * Minimal structural type for a `better-sqlite3` Database. We only need what the
 * drizzle driver needs, and typing it structurally avoids forcing the
 * `better-sqlite3` types onto consumers (it is a devDependency only).
 */
export interface BetterSqlite3Like {
  prepare: (sql: string) => unknown;
  exec: (sql: string) => unknown;
  // Index signature so the real better-sqlite3 Database (with many methods) fits.
  [key: string]: unknown;
}

/**
 * Build a drizzle DB from a `better-sqlite3` database instance (Node / tests).
 *
 * The driver is imported dynamically so this package never *statically* depends
 * on `better-sqlite3` — that keeps it out of the dependency graph for the Expo
 * app, which uses `expo-sqlite` instead.
 *
 * @example
 *   import Database from "better-sqlite3";
 *   const db = await createDb(new Database(":memory:"));
 */
export async function createDb(sqlite: BetterSqlite3Like): Promise<FinPilotDb> {
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  // The structural `BetterSqlite3Like` is compatible at runtime; cast for the
  // driver's nominal type. Schema is attached for the relational query API.
  return drizzle(sqlite as never, { schema }) as unknown as FinPilotDb;
}

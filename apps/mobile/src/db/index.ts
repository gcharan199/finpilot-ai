/**
 * Device database wiring.
 *
 * Opens an `expo-sqlite` database, wraps it with the `drizzle-orm/expo-sqlite`
 * driver + the shared `@finpilot/database` schema, and hands the instance to
 * the package's dependency-injected repositories (which accept any SQLite
 * drizzle instance). Also seeds a default account + the finance-engine category
 * list on first run.
 *
 * Migrations are applied via the drizzle Expo migrator (see `runMigrations`),
 * driven by the bundle in `./migrations`.
 */
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import {
  accountsRepo,
  categoriesRepo,
  schema,
  type FinPilotDb,
} from "@finpilot/database";
import { CATEGORIES, type Category } from "@finpilot/finance-engine";
import migrations from "./migrations";

const DB_NAME = "finpilot.db";

/** Categories the budgeting engine treats as essential ("needs"). */
const ESSENTIAL: ReadonlySet<Category> = new Set<Category>([
  "Housing",
  "Utilities",
  "Groceries",
  "Health",
  "Transport",
  "Debt",
]);

/** Emoji glyphs per category for the UI. */
const ICONS: Record<Category, string> = {
  Income: "💰",
  Housing: "🏠",
  Utilities: "💡",
  Groceries: "🛒",
  Dining: "🍽️",
  Transport: "🚗",
  Shopping: "🛍️",
  Health: "🩺",
  Entertainment: "🎬",
  Travel: "✈️",
  Education: "🎓",
  Subscriptions: "🔁",
  Savings: "🐖",
  Debt: "💳",
  Fees: "🧾",
  Other: "•",
};

let sqlite: SQLiteDatabase | null = null;
let dbInstance: FinPilotDb | null = null;

/** Open (once) the expo-sqlite database + build the drizzle instance. */
export function getDb(): FinPilotDb {
  if (dbInstance) return dbInstance;
  sqlite = openDatabaseSync(DB_NAME, { enableChangeListener: true });
  // Enforce FK cascades (matches the schema's onDelete behavior).
  sqlite.execSync("PRAGMA foreign_keys = ON;");
  dbInstance = drizzle(sqlite, { schema }) as unknown as FinPilotDb;
  return dbInstance;
}

/** The raw expo-sqlite handle (for live-query subscriptions). */
export function getSqlite(): SQLiteDatabase {
  if (!sqlite) getDb();
  return sqlite!;
}

/** Apply pending migrations. Idempotent; safe to call on every cold start. */
export async function runMigrations(): Promise<void> {
  const db = getDb();
  await migrate(db as never, migrations);
}

/** The id of the seeded default account. */
export const DEFAULT_ACCOUNT_ID = "acct_default";

/**
 * Seed a default account + all categories if the DB is empty. Idempotent: a
 * second call is a no-op once an account exists.
 */
export async function seedIfEmpty(): Promise<void> {
  const db = getDb();
  const accounts = await accountsRepo.list(db);
  if (accounts.length > 0) return;

  await accountsRepo.create(db, {
    id: DEFAULT_ACCOUNT_ID,
    name: "Everyday",
    type: "checking",
    currency: "USD",
    balance: 0,
  });

  await categoriesRepo.createMany(
    db,
    CATEGORIES.map((name) => ({
      id: `cat_${name.toLowerCase()}`,
      name,
      icon: ICONS[name],
      isEssential: ESSENTIAL.has(name),
    })),
  );
}

/** Full startup sequence: migrate then seed. Called from the root layout. */
export async function initDatabase(): Promise<void> {
  await runMigrations();
  await seedIfEmpty();
}

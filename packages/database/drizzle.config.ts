import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit config — generates migration SQL from `schema.ts`.
 * Dialect is plain SQLite so the output runs on both better-sqlite3 and
 * expo-sqlite. Run with: `pnpm db:generate`.
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./migrations",
});

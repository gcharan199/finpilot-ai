/**
 * Drizzle migrations bundle for the Expo runtime.
 *
 * This is the shape `drizzle-orm/expo-sqlite/migrator`'s `useMigrations` /
 * `migrate` expect: a journal (which migrations exist, in order) plus a map of
 * tag → SQL string. drizzle-kit can generate this file automatically; we author
 * it by hand here because the schema is fixed and frozen (one migration), and
 * the project deliberately avoids relying on `drizzle-kit generate` at app
 * build time.
 *
 * The `.sql` import is inlined to a string by `babel-plugin-inline-import`
 * (configured in babel.config.js), so this works inside the Metro bundle with
 * no filesystem access at runtime. Keep this journal in sync with
 * `@finpilot/database`'s `migrations/meta/_journal.json`.
 */
import journal from "./meta.json";
import m0000 from "./0000_fearless_sentinels.sql";

export default {
  journal,
  migrations: {
    m0000,
  },
};

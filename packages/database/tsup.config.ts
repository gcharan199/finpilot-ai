import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  // drizzle-orm is a runtime dependency the consumer installs; keep it external.
  external: ["drizzle-orm", "better-sqlite3", "expo-sqlite"],
});

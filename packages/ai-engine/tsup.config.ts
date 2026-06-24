import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  // The SDK is a peer the consumer installs; keep it external so we don't bundle it.
  external: ["@google/genai"],
});

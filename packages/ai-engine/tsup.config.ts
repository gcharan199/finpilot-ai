import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  // Native libs are loaded via guarded dynamic import only inside an EAS dev
  // build; keep them external so we never try to bundle them here.
  external: ["llama.rn", "@react-native-ml-kit/text-recognition"],
});

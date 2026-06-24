/**
 * Babel config for the FinPilot Expo app.
 *
 * - `babel-preset-expo` with `jsxImportSource: "nativewind"` so JSX maps to
 *   NativeWind's runtime (className -> styles).
 * - `nativewind/babel` preset compiles Tailwind classes.
 * - `babel-plugin-inline-import` inlines `.sql` files as strings so the drizzle
 *   migrations bundle can `import migration from "./0000.sql"`.
 * - `strip-dynamic-import` neutralizes the on-device provider's
 *   `import(variable)` (Hermes can't compile non-literal dynamic imports).
 * - The worklets plugin (Reanimated 4) MUST be listed last.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      ["babel-plugin-inline-import", { extensions: [".sql"] }],
      "./babel-plugins/strip-dynamic-import.js",
      "react-native-worklets/plugin",
    ],
  };
};

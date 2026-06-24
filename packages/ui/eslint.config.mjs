// Flat ESLint config for @finpilot/ui (React Native + TSX).
//
// The root config targets the pure-TS packages (`**/*.ts` only). This package
// is JSX/TSX, so it brings its own config: the same JS + typescript-eslint
// recommended baseline, extended to `.tsx`, with React-in-scope handled by the
// new JSX transform (no `React` import needed at runtime, but we import it for
// clarity, so no-unused is relaxed for the `React` binding).
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // `.js` files here are CommonJS config (tailwind-preset.js); not TS source.
    ignores: ["dist/**", "node_modules/**", "**/*.js"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_|^React$" },
      ],
    },
  },
);
